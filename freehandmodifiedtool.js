//const EVENTS =cornerstoneTools.importInternal('events');
//import external from './../../externalModules.js';
//import BaseAnnotationTool from './../base/BaseAnnotationTool.js';
const addToolState = cornerstoneTools.importInternal('stateManagement/toolState');
const removeToolState = cornerstoneTools.importInternal('stateManagement/toolState');
//const state = cornerstoneTools.importInternal('store/index');
const triggerEvent = cornerstoneTools.importInternal( 'util/triggerEvent');
// Manipulators
const moveHandleNearImagePoint = cornerstoneTools.importInternal('util/findAndMoveHelpers');
// Implementation Logic
const pointInsideBoundingBox = cornerstoneTools.importInternal('util/pointInsideBoundingBox');
//const calculateSUV = cornerstoneTools.importInternal( '../../util/calculateSUV.js');
//const numbersWithCommas = cornerstoneTools.importInternal('util/numbersWithCommas');
// Drawing
//import { getNewContext, draw, 
const drawJoinedLines = cornerstoneTools.importInternal('drawing/drawJoinedLines');
//import drawLinkedTextBox from '../../drawing/drawLinkedTextBox.js';
//import drawHandles from '../../drawing/drawHandles.js';
const clipToBox = cornerstoneTools.importInternal('util/clip');


//dolaczone const setToolCursor = cornerstoneTools.importInternal('store/setToolCursor');
//dolaczone const hideToolCursor = cornerstoneTools.importInternal('store/setToolCursor');



const freehandRoiCursor = cornerstoneTools.importInternal( 'cursors/index');
const freehandUtils = cornerstoneTools.importInternal( 'util/freehand/freehandUtils');
//const getLogger = cornerstoneTools.importInternal('util/logger)');
//import throttle from '../../util/throttle';
//const logger = getLogger('tools:annotation:FreehandRoiTool');
const insertOrDelete = cornerstoneTools.importInternal('util/freehand/insertOrDelete');
//dolaczone const freehandArea = cornerstoneTools.importInternal('util/freehand/index');
//dolaczone const calculateFreehandStatistics = cornerstoneTools.importInternal('util/freehand/index');
const freehandIntersect = cornerstoneTools.importInternal('util/freehand/index');
// dolaczone const newHandle = cornerstoneTools.importInternal('util/freehand/freehandIntersect');
//const FreehandHandleData = cornerstoneTools.importInternal('util/freehand/FreehandHandleData');
//const globalConfiguration = cornerstoneTools.importInternal('store/modules/globalConfiguration');
/**
 * @public
 * @class FreehandRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing arbitrary polygonal regions of interest, and
 * measuring the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
 class FreehandModifiedTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'FreehandModified',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: defaultFreehandConfiguration(),
      svgCursor: freehandRoiCursor,
    };

    super(props, defaultProps);

    this.isMultiPartTool = true;

    this._drawing = false;
    this._dragging = false;
    this._modifying = false;

    // Create bound callback functions for private event loops
    this._drawingMouseDownCallback = this._drawingMouseDownCallback.bind(this);
    this._drawingMouseMoveCallback = this._drawingMouseMoveCallback.bind(this);
    this._drawingMouseDragCallback = this._drawingMouseDragCallback.bind(this);
    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
    this._drawingMouseDoubleClickCallback = this._drawingMouseDoubleClickCallback.bind(
      this
    );
    this._editMouseUpCallback = this._editMouseUpCallback.bind(this);
    this._editMouseDragCallback = this._editMouseDragCallback.bind(this);

    this._drawingTouchStartCallback = this._drawingTouchStartCallback.bind(
      this
    );
    this._drawingTouchDragCallback = this._drawingTouchDragCallback.bind(this);
    this._drawingDoubleTapClickCallback = this._drawingDoubleTapClickCallback.bind(
      this
    );
    this._editTouchDragCallback = this._editTouchDragCallback.bind(this);

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  createNewMeasurement(eventData) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const measurementData = {
      visible: true,
      active: true,
      invalidated: true,
      color: undefined,
      handles: {
        points: [],
      },
    };

    measurementData.handles.textBox = {
      active: false,
      hasMoved: false,
      movesIndependently: false,
      drawnIndependently: true,
      allowedOutsideImage: true,
      hasBoundingBox: true,
    };

    return measurementData;
  }

  /**
   *
   *
   * @param {*} element element
   * @param {*} data data
   * @param {*} coords coords
   * @returns {Boolean}
   */
  pointNearTool(element, data, coords) {
    const validParameters = data && data.handles && data.handles.points;

    if (!validParameters) {
      throw new Error(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    const isPointNearTool = this._pointNearHandle(element, data, coords);

    if (isPointNearTool !== undefined) {
      return true;
    }

    return false;
  }

  /**
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {number} the distance in px from the provided coordinates to the
   * closest rendered portion of the annotation. -1 if the distance cannot be
   * calculated.
   */
  distanceFromPoint(element, data, coords) {
    let distance = Infinity;

    for (let i = 0; i < data.handles.points.length; i++) {
      const distanceI = cornerstoneMath.point.distance(
        data.handles.points[i],
        coords
      );

      distance = Math.min(distance, distanceI);
    }

    // If an error caused distance not to be calculated, return -1.
    if (distance === Infinity) {
      return -1;
    }

    return distance;
  }

  /**
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {number} the distance in canvas units from the provided coordinates to the
   * closest rendered portion of the annotation. -1 if the distance cannot be
   * calculated.
   */
  distanceFromPointCanvas(element, data, coords) {
    let distance = Infinity;

    if (!data) {
      return -1;
    }

    const canvasCoords = cornerstone.pixelToCanvas(element, coords);

    const points = data.handles.points;

    for (let i = 0; i < points.length; i++) {
      const handleCanvas = cornerstone.pixelToCanvas(
        element,
        points[i]
      );

      const distanceI = cornerstoneMath.point.distance(
        handleCanvas,
        canvasCoords
      );

      distance = Math.min(distance, distanceI);
    }

    // If an error caused distance not to be calculated, return -1.
    if (distance === Infinity) {
      return -1;
    }

    return distance;
  }

  /**
   *
   *
   *
   * @param {Object} image image
   * @param {Object} element element
   * @param {Object} data data
   *
   * @returns {void}  void
   */
  updateCachedStats(image, element, data) {
    // Define variables for the area and mean/standard deviation
    let meanStdDev, meanStdDevSUV;

    const seriesModule = cornerstone.metaData.get(
      'generalSeriesModule',
      image.imageId
    );
    const modality = seriesModule ? seriesModule.modality : null;

    const points = data.handles.points;
    // If the data has been invalidated, and the tool is not currently active,
    // We need to calculate it again.

    // Retrieve the bounds of the ROI in image coordinates
    const bounds = {
      left: points[0].x,
      right: points[0].x,
      bottom: points[0].y,
      top: points[0].x,
    };

    for (let i = 0; i < points.length; i++) {
      bounds.left = Math.min(bounds.left, points[i].x);
      bounds.right = Math.max(bounds.right, points[i].x);
      bounds.bottom = Math.min(bounds.bottom, points[i].y);
      bounds.top = Math.max(bounds.top, points[i].y);
    }

    const polyBoundingBox = {
      left: bounds.left,
      top: bounds.bottom,
      width: Math.abs(bounds.right - bounds.left),
      height: Math.abs(bounds.top - bounds.bottom),
    };

    // Store the bounding box information for the text box
      data.polyBoundingBox = polyBoundingBox;


      function getOrigPixels(element, x, y, width, height) {
          if (element === undefined) {
              throw new Error('parameter element must not be undefined');
          }

          x = Math.round(x);
          y = Math.round(y);
          const enabledElement = cornerstone.getEnabledElement(element);
          const storedPixels = [];
          let index = 0;
          const image = cornerstone.getEnabledElement(element).image;
          var pixelData = null;

          if (image.color == true) {
              pixelData = image.origPixelData;
          }
          else {
              pixelData = image.getPixelData();
          }

          for (let row = 0; row < height; row++) {
              for (let column = 0; column < width; column++) {
                  const spIndex = ((row + y) * enabledElement.image.columns) + (column + x);
                  storedPixels[index++] = pixelData[spIndex];
              }
          }
          //console.log('sp: ' + storedPixels);
          return storedPixels;
      }

    // First, make sure this is not a color image, since no mean / standard
    // Deviation will be calculated for color images.
 //   if (!image.color) {
      // Retrieve the array of pixels that the ROI bounds cover
      const pixels = getOrigPixels(
        element,
        polyBoundingBox.left,
        polyBoundingBox.top,
        polyBoundingBox.width,
        polyBoundingBox.height
        );
   
      // Calculate the mean & standard deviation from the pixels and the object shape


      meanStdDev = _calculateFreehandStatistics(
       // this,
        pixels,
          polyBoundingBox,
          data.handles.points
        );
 
      if (modality === 'PT') {
        // If the image is from a PET scan, use the DICOM tags to
        // Calculate the SUV from the mean and standard deviation.

        // Note that because we are using modality pixel values from getPixels, and
        // The calculateSUV routine also rescales to modality pixel values, we are first
        // Returning the values to storedPixel values before calcuating SUV with them.
        // TODO: Clean this up? Should we add an option to not scale in calculateSUV?
        meanStdDevSUV = {
          mean: calculateSUV(
            image,
            (meanStdDev.mean - image.intercept) / image.slope
          ),
          stdDev: calculateSUV(
            image,
            (meanStdDev.stdDev - image.intercept) / image.slope
          ),
        };
      }

      // If the mean and standard deviation values are sane, store them for later retrieval
      if (meanStdDev && !isNaN(meanStdDev.mean)) {
        data.meanStdDev = meanStdDev;
        data.meanStdDevSUV = meanStdDevSUV;
      }
    

    // Retrieve the pixel spacing values, and if they are not
    // Real non-zero values, set them to 1
    const columnPixelSpacing = image.columnPixelSpacing || 1;
    const rowPixelSpacing = image.rowPixelSpacing || 1;
    const scaling = columnPixelSpacing * rowPixelSpacing;

    const area = freehandArea(data.handles.points, scaling);

     



    // If the area value is sane, store it for later retrieval
    if (!isNaN(area)) {
      data.area = area/100;
    }

    // Set the invalidated flag to false so that this data won't automatically be recalculated
    data.invalidated = false;
  }

  /**
   *
   *
   * @param {*} evt
   * @returns {undefined}
   */
  renderToolData(evt) {
    const eventData = evt.detail;

    // If we have no toolState for this element, return immediately as there is nothing to do
    const toolState = cornerstoneTools.getToolState(evt.currentTarget, this.name);

    if (!toolState) {
      return;
    }

    const { image, element } = eventData;
    const config = this.configuration;
    const seriesModule = cornerstone.metaData.get(
      'generalSeriesModule',
      image.imageId
    );
    const modality = seriesModule ? seriesModule.modality : null;

    // We have tool data for this element - iterate over each one and draw it
    const context = getNewContext(eventData.canvasContext.canvas);
      const lineWidth = cornerstoneTools.toolStyle.getToolWidth();

      for (let i = 0; i < toolState.data.length; i++) {
          const data = toolState.data[i];
          

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
          let color = cornerstoneTools.toolColors.getColorIfActive(data);
        let fillColor;

        if (data.active) {
          if (data.handles.invalidHandlePlacement) {
            color = config.invalidColor;
            fillColor = config.invalidColor;
          } else {
            color = cornerstoneTools.toolColors.getColorIfActive(data);
            fillColor = cornerstoneTools.toolColors.getFillColor();
          }
        } else {
            fillColor = cornerstoneTools.toolColors.getToolColor();
        }

        if (data.handles.points.length) {
          for (let j = 0; j < data.handles.points.length; j++) {
            const lines = [...data.handles.points[j].lines];
            const points = data.handles.points;

            if (j === points.length - 1 && !data.polyBoundingBox) {
              // If it's still being actively drawn, keep the last line to
              // The mouse location
              lines.push(config.mouseLocation.handles.start);
            }
            drawJoinedLines(context, element, data.handles.points[j], lines, {
              color,
            });
          }
        }

        // Draw handles

        const options = {
          color,
          fill: fillColor,
        };

        if (config.alwaysShowHandles || (data.active && data.polyBoundingBox)) {
          // Render all handles
          options.handleRadius = config.activeHandleRadius;

          if (this.configuration.drawHandles) {
            drawHandles(context, eventData, data.handles.points, options);
          }
        }

        if (data.canComplete) {
          // Draw large handle at the origin if can complete drawing
          options.handleRadius = config.completeHandleRadius;
          const handle = data.handles.points[0];

          if (this.configuration.drawHandles) {
            drawHandles(context, eventData, [handle], options);
          }
        }

        if (data.active && !data.polyBoundingBox) {
          // Draw handle at origin and at mouse if actively drawing
          options.handleRadius = config.activeHandleRadius;

          if (this.configuration.drawHandles) {
            drawHandles(
              context,
              eventData,
              config.mouseLocation.handles,
              options
            );
          }

          const firstHandle = data.handles.points[0];

          if (this.configuration.drawHandles) {
            drawHandles(context, eventData, [firstHandle], options);
          }
        }

        // Update textbox stats
        if (data.invalidated === true && !data.active) {
          if (data.meanStdDev && data.meanStdDevSUV && data.area) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        // Only render text if polygon ROI has been completed and freehand 'shiftKey' mode was not used:
        if (data.polyBoundingBox && !data.handles.textBox.freehand) {
          // If the textbox has not been moved by the user, it should be displayed on the right-most
          // Side of the tool.
          if (!data.handles.textBox.hasMoved) {
            // Find the rightmost side of the polyBoundingBox at its vertical center, and place the textbox here
            // Note that this calculates it in image coordinates
            data.handles.textBox.x =
              data.polyBoundingBox.left + data.polyBoundingBox.width;
            data.handles.textBox.y =
              data.polyBoundingBox.top + data.polyBoundingBox.height / 2;
          }

          const text = textBoxText.call(this, data,i+1);

          drawLinkedTextBox(
            context,
            element,
            data.handles.textBox,
            text,
            data.handles.points,
            textBoxAnchorPoints,
            color,
            lineWidth,
            0,
            true
          );
        }
      });
    }

    function textBoxText(data,datalength) {
      const { meanStdDev, meanStdDevSUV, area } = data;
      // Define an array to store the rows of text for the textbox
        const textLines = [];

    // If the area is a sane value, display it
      if (area) {
        // Determine the area suffix based on the pixel spacing in the image.
        // If pixel spacing is present, use millimeters. Otherwise, use pixels.
        // This uses Char code 178 for a superscript 2
        let suffix = ` cm${String.fromCharCode(178)}`;

        if (!image.rowPixelSpacing || !image.columnPixelSpacing) {
          suffix = ` pixels${String.fromCharCode(178)}`;
        }

        // Create a line of text to display the area and its units
        const areaText = `Area: ${numbersWithCommas(area.toFixed(1))}${suffix}`;
        let datalengthString = `ROI F${datalength}`;
        // Add this text line to the array to be displayed in the textbox
          textLines.push(`${datalengthString}`);
          textLines.push(areaText);
      }


      // If the mean and standard deviation values are present, display them
      if (meanStdDev && meanStdDev.mean !== undefined) {
        // If the modality is CT, add HU to denote Hounsfield Units
        let moSuffix = '';

        if (modality === 'CT') {
          moSuffix = 'HU';
        }
        data.unit = moSuffix;

        

        // Create a line of text to display the mean and any units that were specified (i.e. HU)
        let meanText = `Mean: ${numbersWithCommas(
          meanStdDev.mean.toFixed(2)
        )} ${moSuffix}`;
        // Create a line of text to display the standard deviation and any units that were specified (i.e. HU)
        let stdDevText = `StdDev: ${numbersWithCommas(
          meanStdDev.stdDev.toFixed(2)
        )} ${moSuffix}`;

          let sumText = `Sum: ${meanStdDev.sum.value} ${moSuffix}`;
          let minText = `Min: ${meanStdDev.min} ${moSuffix}`;
          const maxText = `Max: ${meanStdDev.max} ${moSuffix}`;


        // If this image has SUV values to display, concatenate them to the text line
        if (meanStdDevSUV && meanStdDevSUV.mean !== undefined) {
          const SUVtext = ' SUV: ';

          meanText +=
            SUVtext + numbersWithCommas(meanStdDevSUV.mean.toFixed(2));
          stdDevText +=
            SUVtext + numbersWithCommas(meanStdDevSUV.stdDev.toFixed(2));
        }

        // Add these text lines to the array to be displayed in the textbox
        textLines.push(sumText);
        textLines.push(stdDevText);
        textLines.push(meanText);
        textLines.push(minText);
        textLines.push(maxText);
      }

  

      return textLines;
    }

    function textBoxAnchorPoints(handles) {
      return handles;
    }
  }

  addNewMeasurement(evt) {
    const eventData = evt.detail;

    this._startDrawing(evt);
    this._addPoint(eventData);

    preventPropagation(evt);
  }

  preMouseDownCallback(evt) {
    const eventData = evt.detail;
    const nearby = this._pointNearHandleAllTools(eventData);

    if (eventData.event.ctrlKey) {
      if (nearby !== undefined && nearby.handleNearby.hasBoundingBox) {
        // Ctrl + clicked textBox, do nothing but still consume event.
      } else {
        insertOrDelete.call(this, evt, nearby);
      }

      preventPropagation(evt);

      return true;
    }

    return false;
  }

  handleSelectedCallback(evt, toolData, handle, interactionType = 'mouse') {
    const { element } = evt.detail;
    const toolState = cornerstoneTools.getToolState(element, this.name);

    if (handle.hasBoundingBox) {
      // Use default move handler.
      moveHandleNearImagePoint(evt, this, toolData, handle, interactionType);

      return;
    }

    const config = this.configuration;

    config.dragOrigin = {
      x: handle.x,
      y: handle.y,
    };

    // Iterating over handles of all toolData instances to find the indices of the selected handle
    for (let toolIndex = 0; toolIndex < toolState.data.length; toolIndex++) {
      const points = toolState.data[toolIndex].handles.points;

      for (let p = 0; p < points.length; p++) {
        if (points[p] === handle) {
          config.currentHandle = p;
          config.currentTool = toolIndex;
        }
      }
    }

    this._modifying = true;

    this._activateModify(element);

    // Interupt eventDispatchers
    preventPropagation(evt);
  }

  /**
   * Event handler for MOUSE_MOVE during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseMoveCallback(evt) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;
      const toolState = cornerstoneTools.getToolState(element, this.name);

    const config = this.configuration;
    const currentTool = config.currentTool;

    const data = toolState.data[currentTool];
    const coords = currentPoints.canvas;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);
    this._checkInvalidHandleLocation(data, eventData);

    // Mouse move -> Polygon Mode
    const handleNearby = this._pointNearHandle(element, data, coords);
    const points = data.handles.points;
    // If there is a handle nearby to snap to
    // (and it's not the actual mouse handle)

    if (
      handleNearby !== undefined &&
      !handleNearby.hasBoundingBox &&
      handleNearby < points.length - 1
    ) {
      config.mouseLocation.handles.start.x = points[handleNearby].x;
      config.mouseLocation.handles.start.y = points[handleNearby].y;
    }

    // Force onImageRendered
    cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_DRAG during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDragCallback(evt) {
    if (!this.options.mouseButtonMask.includes(evt.detail.buttons)) {
      return;
    }

    this._drawingDrag(evt);
  }

  /**
   * Event handler for TOUCH_DRAG during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingTouchDragCallback(evt) {
    this._drawingDrag(evt);
  }

  _drawingDrag(evt) {
    const eventData = evt.detail;
    const { element } = eventData;

      const toolState = cornerstoneTools.getToolState(element, this.name);

    const config = this.configuration;
    const currentTool = config.currentTool;

      const data = toolState.data[currentTool];

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);
    this._checkInvalidHandleLocation(data, eventData);
    this._addPointPencilMode(eventData, data.handles.points);
    this._dragging = true;

    // Force onImageRendered
    cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_UP during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseUpCallback(evt) {
    const { element } = evt.detail;

    if (!this._dragging) {
      return;
    }

    this._dragging = false;

    const config = this.configuration;
    const currentTool = config.currentTool;
      const toolState = cornerstoneTools.getToolState(element, this.name);
      const data = toolState.data[currentTool];

    if (!end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
    }

    preventPropagation(evt);

    return;
  }

  /**
   * Event handler for MOUSE_DOWN during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDownCallback(evt) {
    const eventData = evt.detail;
    const { buttons, currentPoints, element } = eventData;

    if (!this.options.mouseButtonMask.includes(buttons)) {
      return;
    }

    const coords = currentPoints.canvas;

    const config = this.configuration;
    const currentTool = config.currentTool;
      const toolState = cornerstoneTools.getToolState(element, this.name);
      const data = toolState.data[currentTool];

    const handleNearby = this._pointNearHandle(element, data, coords);

    if (!end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
    } else if (handleNearby === undefined) {
      this._addPoint(eventData);
    }

    preventPropagation(evt);

    return;
  }

  /**
   * Event handler for TOUCH_START during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingTouchStartCallback(evt) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;

    const coords = currentPoints.canvas;

    const config = this.configuration;
    const currentTool = config.currentTool;
      const toolState = cornerstoneTools.getToolState(element, this.name);
      const data = toolState.data[currentTool];

    const handleNearby = this._pointNearHandle(element, data, coords);

    if (!freehandIntersect.end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
    } else if (handleNearby === undefined) {
      this._addPoint(eventData);
    }

    preventPropagation(evt);

    return;
  }

  /** Ends the active drawing loop and completes the polygon.
   *
   * @public
   * @param {Object} element - The element on which the roi is being drawn.
   * @returns {null}
   */
  completeDrawing(element) {
    if (!this._drawing) {
      return;
    }
      const toolState = cornerstoneTools.getToolState(element, this.name);
    const config = this.configuration;
      const data =toolState.data[config.currentTool];

    if (
      !end(data.handles.points) &&
      data.handles.points.length >= 2
    ) {
      const lastHandlePlaced = config.currentHandle;

      data.polyBoundingBox = {};
      this._endDrawing(element, lastHandlePlaced);
    }
  }

  /**
   * Event handler for MOUSE_DOUBLE_CLICK during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDoubleClickCallback(evt) {
    const { element } = evt.detail;

    this.completeDrawing(element);

    preventPropagation(evt);
  }

  /**
   * Event handler for DOUBLE_TAP during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingDoubleTapClickCallback(evt) {
    const { element } = evt.detail;

    this.completeDrawing(element);

    preventPropagation(evt);
  }

  /**
   * Event handler for MOUSE_DRAG during handle drag event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseDragCallback(evt) {
    const eventData = evt.detail;
    const { element, buttons } = eventData;

    if (!this.options.mouseButtonMask.includes(buttons)) {
      return;
    }

      const toolState = cornerstoneTools.getToolState(element, this.name);

    const config = this.configuration;
      const data = toolState.data[config.currentTool];
    const currentHandle = config.currentHandle;
    const points = data.handles.points;
    let handleIndex = -1;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);

    data.handles.invalidHandlePlacement = modify(
      points,
      currentHandle
    );
    data.active = true;
    data.highlight = true;
    points[currentHandle].x = config.mouseLocation.handles.start.x;
    points[currentHandle].y = config.mouseLocation.handles.start.y;
    handleIndex = this._getPrevHandleIndex(currentHandle, points);

    if (currentHandle >= 0) {
      const lastLineIndex = points[handleIndex].lines.length - 1;
      const lastLine = points[handleIndex].lines[lastLineIndex];

      lastLine.x = config.mouseLocation.handles.start.x;
      lastLine.y = config.mouseLocation.handles.start.y;
    }

    // Update the image
    cornerstone.updateImage(element);
  }

  /**
   * Event handler for TOUCH_DRAG during handle drag event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {void}
   */
  _editTouchDragCallback(evt) {
    const eventData = evt.detail;
    const { element } = eventData;

      const toolState = cornerstoneTools.getToolState(element, this.name);

    const config = this.configuration;
      const data = toolState.data[config.currentTool];
    const currentHandle = config.currentHandle;
    const points = data.handles.points;
    let handleIndex = -1;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);

    data.handles.invalidHandlePlacement = modify(
      points,
      currentHandle
    );
    data.active = true;
    data.highlight = true;
    points[currentHandle].x = config.mouseLocation.handles.start.x;
    points[currentHandle].y = config.mouseLocation.handles.start.y;

    handleIndex = this._getPrevHandleIndex(currentHandle, points);

    if (currentHandle >= 0) {
      const lastLineIndex = points[handleIndex].lines.length - 1;
      const lastLine = points[handleIndex].lines[lastLineIndex];

      lastLine.x = config.mouseLocation.handles.start.x;
      lastLine.y = config.mouseLocation.handles.start.y;
    }

    // Update the image
    cornerstone.updateImage(element);
  }

  /**
   * Returns the previous handle to the current one.
   * @param {Number} currentHandle - the current handle index
   * @param {Array} points - the handles Array of the freehand data
   * @returns {Number} - The index of the previos handle
   */
  _getPrevHandleIndex(currentHandle, points) {
    if (currentHandle === 0) {
      return points.length - 1;
    }

    return currentHandle - 1;
  }

  /**
   * Event handler for MOUSE_UP during handle drag event loop.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseUpCallback(evt) {
    const eventData = evt.detail;
    const { element } = eventData;
      const toolState = cornerstoneTools.getToolState(element, this.name);

    this._deactivateModify(element);

    this._dropHandle(eventData, toolState);
    this._endDrawing(element);

    cornerstone.updateImage(element);
  }

  /**
   * Places a handle of the freehand tool if the new location is valid.
   * If the new location is invalid the handle snaps back to its previous position.
   *
   * @private
   * @param {Object} eventData - Data object associated with the event.
   * @param {Object} toolState - The data associated with the freehand tool.
   * @modifies {toolState}
   * @returns {undefined}
   */
  _dropHandle(eventData, toolState) {
    const config = this.configuration;
    const currentTool = config.currentTool;
      const handles = toolState.data[currentTool].handles;
    const points = handles.points;

    // Don't allow the line being modified to intersect other lines
    if (handles.invalidHandlePlacement) {
      const currentHandle = config.currentHandle;
      const currentHandleData = points[currentHandle];
      let previousHandleData;

      if (currentHandle === 0) {
        const lastHandleID = points.length - 1;

        previousHandleData = points[lastHandleID];
      } else {
        previousHandleData = points[currentHandle - 1];
      }

      // Snap back to previous position
      currentHandleData.x = config.dragOrigin.x;
      currentHandleData.y = config.dragOrigin.y;
      previousHandleData.lines[0] = currentHandleData;
     
      handles.invalidHandlePlacement = false;
    }
  }

  /**
   * Begining of drawing loop when tool is active and a click event happens far
   * from existing handles.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _startDrawing(evt) {
    const eventData = evt.detail;
    const measurementData = this.createNewMeasurement(eventData);
    const { element } = eventData;
    const config = this.configuration;
    let interactionType;

    if (evt.type ===  cornerstoneTools.EVENTS.MOUSE_DOWN_ACTIVATE) {
      interactionType = 'Mouse';
    } else if (evt.type === cornerstoneTools.EVENTS.TOUCH_START_ACTIVE) {
      interactionType = 'Touch';
    }
    this._activateDraw(element, interactionType);
    this._getMouseLocation(eventData);

      cornerstoneTools.addToolState(element, this.name, measurementData);

      const toolState = cornerstoneTools.getToolState(element, this.name);

      config.currentTool = toolState.data.length - 1;

      this._activeDrawingToolReference = toolState.data[config.currentTool];
  }

  /**
   * Adds a point on mouse click in polygon mode.
   *
   * @private
   * @param {Object} eventData - data object associated with an event.
   * @returns {undefined}
   */
  _addPoint(eventData) {
    const { currentPoints, element } = eventData;
      const toolState = cornerstoneTools.getToolState(element, this.name);

    // Get the toolState from the last-drawn polygon
    const config = this.configuration;
    const data = toolState.data[config.currentTool];

    if (data.handles.invalidHandlePlacement) {
      return;
    }

    const newHandleData = new FreehandHandleData(currentPoints.image);

    // If this is not the first handle
      if (data.handles.points.length) {
      // Add the line from the current handle to the new handle
      data.handles.points[config.currentHandle - 1].lines.push(
        currentPoints.image
      );
    }

    // Add the new handle
    data.handles.points.push(newHandleData);

    // Increment the current handle value
    config.currentHandle += 1;

    // Force onImageRendered to fire
    cornerstone.updateImage(element);
    this.fireModifiedEvent(element, data);
  }

  /**
   * If in pencilMode, check the mouse position is farther than the minimum
   * distance between points, then add a point.
   *
   * @private
   * @param {Object} eventData - Data object associated with an event.
   * @param {Object} points - Data object associated with the tool.
   * @returns {undefined}
   */
  _addPointPencilMode(eventData, points) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config.mouseLocation.handles.start;

    const handleFurtherThanMinimumSpacing = handle =>
      this._isDistanceLargerThanSpacing(element, handle, mousePoint);

    if (points.every(handleFurtherThanMinimumSpacing)) {
      this._addPoint(eventData);
    }
  }

  /**
   * Ends the active drawing loop and completes the polygon.
   *
   * @private
   * @param {Object} element - The element on which the roi is being drawn.
   * @param {Object} handleNearby - the handle nearest to the mouse cursor.
   * @returns {undefined}
   */
  _endDrawing(element, handleNearby) {
      const toolState = cornerstoneTools.getToolState(element, this.name);
    const config = this.configuration;
      const data = toolState.data[config.currentTool];

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Connect the end handle to the origin handle
    if (handleNearby !== undefined) {
      const points = data.handles.points;
      points[config.currentHandle - 1].lines.push(points[0]);
    }

    if (this._modifying) {
      this._modifying = false;
      data.invalidated = true;
    }

    // Reset the current handle
    config.currentHandle = 0;
    config.currentTool = -1;
    data.canComplete = false;

    if (this._drawing) {
      this._deactivateDraw(element);
    }

    cornerstone.updateImage(element);

    this.fireModifiedEvent(element, data);
    this.fireCompletedEvent(element, data);
  }

  /**
   * Returns a handle of a particular tool if it is close to the mouse cursor
   *
   * @private
   * @param {Object} element - The element on which the roi is being drawn.
   * @param {Object} data      Data object associated with the tool.
   * @param {*} coords
   * @returns {Number|Object|Boolean}
   */
  _pointNearHandle(element, data, coords) {
    if (data.handles === undefined || data.handles.points === undefined) {
      return;
    }

    if (data.visible === false) {
      return;
    }

    for (let i = 0; i < data.handles.points.length; i++) {
      const handleCanvas = cornerstone.pixelToCanvas(
        element,
        data.handles.points[i]
      );

      if (cornerstoneMath.point.distance(handleCanvas, coords) < 6) {
        return i;
      }
    }

    // Check to see if mouse in bounding box of textbox
    if (data.handles.textBox) {
      if (pointInsideBoundingBox(data.handles.textBox, coords)) {
        return data.handles.textBox;
      }
    }
  }

  /**
   * Returns a handle if it is close to the mouse cursor (all tools)
   *
   * @private
   * @param {Object} eventData - data object associated with an event.
   * @returns {Object}
   */
  _pointNearHandleAllTools(eventData) {
    const { currentPoints, element } = eventData;
    const coords = currentPoints.canvas;
      const toolState = cornerstoneTools.getToolState(element, this.name);

    if (!toolState) {
      return;
    }

    let handleNearby;

    for (let toolIndex = 0; toolIndex < toolState.data.length; toolIndex++) {
      handleNearby = this._pointNearHandle(
        element,
        toolState.data[toolIndex],
        coords
      );
      if (handleNearby !== undefined) {
        return {
          handleNearby,
          toolIndex,
        };
      }
    }
  }

  /**
   * Gets the current mouse location and stores it in the configuration object.
   *
   * @private
   * @param {Object} eventData The data assoicated with the event.
   * @returns {undefined}
   */
  _getMouseLocation(eventData) {
    const { currentPoints, image } = eventData;
    // Set the mouseLocation handle
    const config = this.configuration;

    config.mouseLocation.handles.start.x = currentPoints.image.x;
    config.mouseLocation.handles.start.y = currentPoints.image.y;
    clipToBox(config.mouseLocation.handles.start, image);
  }

  /**
   * Returns true if the proposed location of a new handle is invalid.
   *
   * @private
   * @param {Object} data      Data object associated with the tool.
   * @param {Object} eventData The data assoicated with the event.
   * @returns {Boolean}
   */
  _checkInvalidHandleLocation(data, eventData) {
    if (data.handles.points.length < 2) {
      return true;
    }

    let invalidHandlePlacement;

    if (this._dragging) {
      invalidHandlePlacement = this._checkHandlesPencilMode(data, eventData);
    } else {
      invalidHandlePlacement = this._checkHandlesPolygonMode(data, eventData);
    }

    data.handles.invalidHandlePlacement = invalidHandlePlacement;
  }

  /**
   * Returns true if the proposed location of a new handle is invalid (in polygon mode).
   *
   * @private
   *
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data assoicated with the event.
   * @returns {Boolean}
   */
  _checkHandlesPolygonMode(data, eventData) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config.mouseLocation.handles.start;
    const points = data.handles.points;
    let invalidHandlePlacement = false;

    data.canComplete = false;

    const mouseAtOriginHandle = this._isDistanceSmallerThanCompleteSpacingCanvas(
      element,
      points[0],
      mousePoint
    );

    if (
      mouseAtOriginHandle &&
      !end(points) &&
      points.length > 2
    ) {
      data.canComplete = true;
      invalidHandlePlacement = false;
    } else {
      invalidHandlePlacement = _newHandle(mousePoint, points);
    }

    return invalidHandlePlacement;
  }

  /**
   * Returns true if the proposed location of a new handle is invalid (in pencilMode).
   *
   * @private
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data associated with the event.
   * @returns {Boolean}
   */
  _checkHandlesPencilMode(data, eventData) {
    const config = this.configuration;
    const mousePoint = config.mouseLocation.handles.start;
    const points = data.handles.points;
      let invalidHandlePlacement = _newHandle(
      mousePoint,
      points
    );

    if (invalidHandlePlacement === false) {
      invalidHandlePlacement = this._invalidHandlePencilMode(data, eventData);
    }

    return invalidHandlePlacement;
  }

  /**
   * Returns true if the mouse position is far enough from previous points (in pencilMode).
   *
   * @private
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data associated with the event.
   * @returns {Boolean}
   */
  _invalidHandlePencilMode(data, eventData) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config.mouseLocation.handles.start;
    const points = data.handles.points;

    const mouseAtOriginHandle = this._isDistanceSmallerThanCompleteSpacingCanvas(
      element,
      points[0],
      mousePoint
    );

    if (mouseAtOriginHandle) {
      data.canComplete = true;

      return false;
    }

    data.canComplete = false;

    // Compare with all other handles appart from the last one
    for (let i = 1; i < points.length - 1; i++) {
      if (this._isDistanceSmallerThanSpacing(element, points[i], mousePoint)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns true if two points are closer than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceSmallerThanCompleteSpacingCanvas(element, p1, p2) {
    const p1Canvas = cornerstone.pixelToCanvas(element, p1);
    const p2Canvas = cornerstone.pixelToCanvas(element, p2);

    let completeHandleRadius;

    if (this._drawingInteractionType === 'Mouse') {
      completeHandleRadius = this.configuration.completeHandleRadius;
    } else if (this._drawingInteractionType === 'Touch') {
      completeHandleRadius = this.configuration.completeHandleRadiusTouch;
    }

    return this._compareDistanceToSpacing(
      element,
      p1Canvas,
      p2Canvas,
      '<',
      completeHandleRadius
    );
  }

  /**
   * Returns true if two points are closer than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceSmallerThanSpacing(element, p1, p2) {
    return this._compareDistanceToSpacing(element, p1, p2, '<');
  }

  /**
   * Returns true if two points are farther than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceLargerThanSpacing(element, p1, p2) {
    return this._compareDistanceToSpacing(element, p1, p2, '>');
  }

  /**
   * Compares the distance between two points to this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @param  {string} comparison  The comparison to make.
   * @param  {number} spacing     The allowed canvas spacing
   * @returns {boolean}           True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _compareDistanceToSpacing(
    element,
    p1,
    p2,
    comparison = '>',
    spacing = this.configuration.spacing
  ) {
    if (comparison === '>') {
      return cornerstoneMath.point.distance(p1, p2) > spacing;
    }

    return cornerstoneMath.point.distance(p1, p2) < spacing;
  }

  /**
   * Adds drawing loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @param {string} interactionType - The interactionType used for the loop.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateDraw(element, interactionType = 'Mouse') {
    this._drawing = true;
    this._drawingInteractionType = interactionType;
   //state.isMultiPartToolActive = true;
      _state.activeMultiPartTool = true;
   _hideToolCursor(this.element);

    // Polygonal Mode
    element.addEventListener(cornerstoneTools.EVENTS.MOUSE_DOWN, this._drawingMouseDownCallback);
      element.addEventListener(cornerstoneTools.EVENTS.MOUSE_MOVE, this._drawingMouseMoveCallback);
    element.addEventListener(
        cornerstoneTools.EVENTS.MOUSE_DOUBLE_CLICK,
      this._drawingMouseDoubleClickCallback
    );

    // Drag/Pencil Mode
      element.addEventListener(cornerstoneTools.EVENTS.MOUSE_DRAG, this._drawingMouseDragCallback);
      element.addEventListener(cornerstoneTools.EVENTS.MOUSE_UP, this._drawingMouseUpCallback);

    // Touch
    element.addEventListener(
        cornerstoneTools.EVENTS.TOUCH_START,
      this._drawingMouseMoveCallback
    );
    element.addEventListener(
        cornerstoneTools.EVENTS.TOUCH_START,
      this._drawingTouchStartCallback
    );

      element.addEventListener(cornerstoneTools.EVENTS.TOUCH_DRAG, this._drawingTouchDragCallback);
      element.addEventListener(cornerstoneTools.EVENTS.TOUCH_END, this._drawingMouseUpCallback);
    element.addEventListener(
        cornerstoneTools.EVENTS.DOUBLE_TAP,
      this._drawingDoubleTapClickCallback
    );

    cornerstone.updateImage(element);
  }

  /**
   * Removes drawing loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateDraw(element) {
      this._drawing = false;
     // state.isMultiPartToolActive = false;
      //_state.activeMultiPartTool = false;
    this._activeDrawingToolReference = null;
    this._drawingInteractionType = null;
    //_setToolCursor(this.element, this.svgCursor);

    element.removeEventListener(
        cornerstoneTools.EVENTS.MOUSE_DOWN,
      this._drawingMouseDownCallback
    );
    element.removeEventListener(
        cornerstoneTools.EVENTS.MOUSE_MOVE,
      this._drawingMouseMoveCallback
    );
    element.removeEventListener(
        cornerstoneTools.EVENTS.MOUSE_DOUBLE_CLICK,
      this._drawingMouseDoubleClickCallback
    );
    element.removeEventListener(
        cornerstoneTools.EVENTS.MOUSE_DRAG,
      this._drawingMouseDragCallback
    );
      element.removeEventListener(cornerstoneTools.EVENTS.MOUSE_UP, this._drawingMouseUpCallback);

    // Touch
    element.removeEventListener(
        cornerstoneTools.EVENTS.TOUCH_START,
      this._drawingTouchStartCallback
    );
    element.removeEventListener(
        cornerstoneTools.EVENTS.TOUCH_DRAG,
      this._drawingTouchDragCallback
    );
    element.removeEventListener(
        cornerstoneTools.EVENTS.TOUCH_START,
      this._drawingMouseMoveCallback
    );
      element.removeEventListener(cornerstoneTools.EVENTS.TOUCH_END, this._drawingMouseUpCallback);

    cornerstone.updateImage(element);
  }

  /**
   * Adds modify loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateModify(element) {
    _state.isToolLocked = true;

      element.addEventListener(cornerstoneTools.EVENTS.MOUSE_UP, this._editMouseUpCallback);
      element.addEventListener(cornerstoneTools.EVENTS.MOUSE_DRAG, this._editMouseDragCallback);
      element.addEventListener(cornerstoneTools.EVENTS.MOUSE_CLICK, this._editMouseUpCallback);

      element.addEventListener(cornerstoneTools.EVENTS.TOUCH_END, this._editMouseUpCallback);
      element.addEventListener(cornerstoneTools.EVENTS.TOUCH_DRAG, this._editTouchDragCallback);

    cornerstone.updateImage(element);
  }

  /**
   * Removes modify loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateModify(element) {
    _state.isToolLocked = false;

      element.removeEventListener(cornerstoneTools.EVENTS.MOUSE_UP, this._editMouseUpCallback);
      element.removeEventListener(cornerstoneTools.EVENTS.MOUSE_DRAG, this._editMouseDragCallback);
      element.removeEventListener(cornerstoneTools.EVENTS.MOUSE_CLICK, this._editMouseUpCallback);

      element.removeEventListener(cornerstoneTools.EVENTS.TOUCH_END, this._editMouseUpCallback);
      element.removeEventListener(cornerstoneTools.EVENTS.TOUCH_DRAG, this._editTouchDragCallback);

    cornerstone.updateImage(element);
  }

  passiveCallback(element) {
    this._closeToolIfDrawing(element);
  }

  enabledCallback(element) {
    this._closeToolIfDrawing(element);
  }

  disabledCallback(element) {
    this._closeToolIfDrawing(element);
  }

  _closeToolIfDrawing(element) {
    if (this._drawing) {
      // Actively drawing but changed mode.
      const config = this.configuration;
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
      cornerstone.updateImage(element);
    }
  }

  /**
   * Fire MEASUREMENT_MODIFIED event on provided element
   * @param {any} element which freehand data has been modified
   * @param {any} measurementData the measurment data
   * @returns {void}
   */
  fireModifiedEvent(element, measurementData) {
      const eventType = cornerstoneTools.EVENTS.MEASUREMENT_MODIFIED;
    const eventData = {
      toolName: this.name,
      element,
      measurementData,
    };

    triggerEvent(element, eventType, eventData);
  }

  fireCompletedEvent(element, measurementData) {
      const eventType = cornerstoneTools.EVENTS.MEASUREMENT_COMPLETED;
    const eventData = {
      toolName: this.name,
      element,
      measurementData,
    };

    triggerEvent(element, eventType, eventData);
  }

  // ===================================================================
  // Public Configuration API. .
  // ===================================================================

  get spacing() {
    return this.configuration.spacing;
  }

  set spacing(value) {
    if (typeof value !== 'number') {
      throw new Error(
        'Attempting to set freehand spacing to a value other than a number.'
      );
    }

    this.configuration.spacing = value;
    cornerstone.updateImage(this.element);
  }

  get activeHandleRadius() {
    return this.configuration.activeHandleRadius;
  }

  set activeHandleRadius(value) {
    if (typeof value !== 'number') {
      throw new Error(
        'Attempting to set freehand activeHandleRadius to a value other than a number.'
      );
    }

    this.configuration.activeHandleRadius = value;
    cornerstone.updateImage(this.element);
  }

  get completeHandleRadius() {
    return this.configuration.completeHandleRadius;
  }

  set completeHandleRadius(value) {
    if (typeof value !== 'number') {
      throw new Error(
        'Attempting to set freehand completeHandleRadius to a value other than a number.'
      );
    }

    this.configuration.completeHandleRadius = value;
    cornerstone.updateImage(this.element);
  }

  get alwaysShowHandles() {
    return this.configuration.alwaysShowHandles;
  }

  set alwaysShowHandles(value) {
    if (typeof value !== 'boolean') {
      throw new Error(
        'Attempting to set freehand alwaysShowHandles to a value other than a boolean.'
      );
    }

    this.configuration.alwaysShowHandles = value;
    cornerstone.updateImage(this.element);
  }

  get invalidColor() {
    return this.configuration.invalidColor;
  }

  set invalidColor(value) {
    /*
      It'd be easy to check if the color was e.g. a valid rgba color. However
      it'd be difficult to check if the color was a named CSS color without
      bloating the library, so we don't. If the canvas can't intepret the color
      it'll show up grey.
    */

    this.configuration.invalidColor = value;
    cornerstone.updateImage(this.element);
  }

  /**
   * Ends the active drawing loop and removes the polygon.
   *
   * @public
   * @param {Object} element - The element on which the roi is being drawn.
   * @returns {null}
   */
  cancelDrawing(element) {
    if (!this._drawing) {
      return;
    }
      const toolState = cornerstoneTools.getToolState(element, this.name);

    const config = this.configuration;

      const data = toolState.data[config.currentTool];

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Reset the current handle
    config.currentHandle = 0;
    config.currentTool = -1;
    data.canComplete = false;

      cornerstoneTools.removeToolState(element, this.name, data);

    this._deactivateDraw(element);

    cornerstone.updateImage(element);
  }

  /**
   * New image event handler.
   *
   * @public
   * @param  {Object} evt The event.
   * @returns {null}
   */
  newImageCallback(evt) {
    const config = this.configuration;

    if (!(this._drawing && this._activeDrawingToolReference)) {
      return;
    }

    // Actively drawing but scrolled to different image.

    const element = evt.detail.element;
    const data = this._activeDrawingToolReference;

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Connect the end handle to the origin handle
    const points = data.handles.points;

    points[config.currentHandle - 1].lines.push(points[0]);

    // Reset the current handle
    config.currentHandle = 0;
    config.currentTool = -1;
    data.canComplete = false;

    this._deactivateDraw(element);

    cornerstone.updateImage(element);
  }
}

function defaultFreehandConfiguration() {
  return {
    mouseLocation: {
      handles: {
        start: {
          highlight: true,
          active: true,
        },
      },
    },
    spacing: 1,
    activeHandleRadius: 3,
    completeHandleRadius: 6,
    completeHandleRadiusTouch: 28,
    alwaysShowHandles: false,
    invalidColor: 'crimson',
    currentHandle: 0,
    currentTool: -1,
    drawHandles: true,
  };
}

function preventPropagation(evt) {
  evt.stopImmediatePropagation();
  evt.stopPropagation();
  evt.preventDefault();
}


function _newHandle(candidateHandle, dataHandles) {
    // Check if the proposed line will intersect any existent line
    const lastHandleId = dataHandles.length - 1;
    const lastHandle = getCoords(dataHandles[lastHandleId]);
    const _newHandle = getCoords(candidateHandle);

    return _doesIntersectOtherLines(dataHandles, lastHandle, _newHandle, [
        lastHandleId,
    ]);
}

/**
 * Checks if the last line of a polygon will intersect the other lines of the polgyon.
 * @public
 * @function end
 *
 * @param {Object} dataHandles data object associated with the tool.
 * @returns {boolean} Whether the last line intersects with any other lines of the polygon.
 */
function end(dataHandles) {
    const lastHandleId = dataHandles.length - 1;
    const lastHandle = getCoords(dataHandles[lastHandleId]);
    const firstHandle = getCoords(dataHandles[0]);
    return _doesIntersectOtherLines(dataHandles, lastHandle, firstHandle, [
        lastHandleId,
        0,
    ]);
    
}

/**
 * Checks whether the modification of a handle's position causes intersection of the lines of the polygon.
 * @public
 * @method modify
 *
 * @param {Object} dataHandles Data object associated with the tool.
 * @param {number} modifiedHandleId The id of the handle being modified.
 * @returns {boolean} Whether the modfication causes any intersections.
 */
function modify(dataHandles, modifiedHandleId) {
    // Check if the modifiedHandle's previous and next lines will intersect any other line in the polygon
    const modifiedHandle = getCoords(dataHandles[modifiedHandleId]);

    // Previous neightbor handle
    let neighborHandleId = modifiedHandleId - 1;

    if (modifiedHandleId === 0) {
        neighborHandleId = dataHandles.length - 1;
    }

    let neighborHandle = getCoords(dataHandles[neighborHandleId]);

    if (
        _doesIntersectOtherLines(dataHandles, modifiedHandle, neighborHandle, [
            modifiedHandleId,
            neighborHandleId,
        ])
    ) {
        return true;
    }

    // Next neightbor handle
    if (modifiedHandleId === dataHandles.length - 1) {
        neighborHandleId = 0;
    } else {
        neighborHandleId = modifiedHandleId + 1;
    }

    neighborHandle = getCoords(dataHandles[neighborHandleId]);

    return _doesIntersectOtherLines(dataHandles, modifiedHandle, neighborHandle, [
        modifiedHandleId,
        neighborHandleId,
    ]);
}

/**
 * Checks whether the line (p1,q1) intersects any of the other lines in the polygon.
 * @private
 * @function doesIntersectOtherLines
 *
 * @param {Object} dataHandles Data object associated with the tool.
 * @param {Object} p1 Coordinates of the start of the line.
 * @param {Object} q1 Coordinates of the end of the line.
 * @param {Object} ignoredHandleIds Ids of handles to ignore (i.e. lines that share a vertex with the line being tested).
 * @returns {boolean} Whether the line intersects any of the other lines in the polygon.
 */
function _doesIntersectOtherLines(dataHandles, p1, q1, ignoredHandleIds) {
    let j = dataHandles.length - 1;

    for (let i = 0; i < dataHandles.length; i++) {
        if (
            ignoredHandleIds.indexOf(i) !== -1 ||
            ignoredHandleIds.indexOf(j) !== -1
        ) {
            j = i;
            continue;
        }

        const p2 = getCoords(dataHandles[j]);
        const q2 = getCoords(dataHandles[i]);

        if (doesIntersect(p1, q1, p2, q2)) {
            return true;
            
        }

        j = i;
    }
    return false;
}

/**
 * Checks whether the line (p1,q1) intersects the line (p2,q2) via an orientation algorithm.
 * @private
 * @function doesIntersect
 *
 * @param {Object} p1 Coordinates of the start of the line 1.
 * @param {Object} q1 Coordinates of the end of the line 1.
 * @param {Object} p2 Coordinates of the start of the line 2.
 * @param {Object} q2 Coordinates of the end of the line 2.
 * @returns {boolean} Whether lines (p1,q1) and (p2,q2) intersect.
 */
function doesIntersect(p1, q1, p2, q2) {
    let result = false;

    const orient = [
        orientation(p1, q1, p2),
        orientation(p1, q1, q2),
        orientation(p2, q2, p1),
        orientation(p2, q2, q1),
    ];

    // General Case
    if (orient[0] !== orient[1] && orient[2] !== orient[3]) {
        return true;
    }

    // Special Cases
    if (orient[0] === 0 && onSegment(p1, p2, q1)) {
        // If p1, q1 and p2 are colinear and p2 lies on segment p1q1
        result = true;
    } else if (orient[1] === 0 && onSegment(p1, q2, q1)) {
        // If p1, q1 and p2 are colinear and q2 lies on segment p1q1
        result = true;
    } else if (orient[2] === 0 && onSegment(p2, p1, q2)) {
        // If p2, q2 and p1 are colinear and p1 lies on segment p2q2
        result = true;
    } else if (orient[3] === 0 && onSegment(p2, q1, q2)) {
        // If p2, q2 and q1 are colinear and q1 lies on segment p2q2
        result = true;
    }

    return result;
}

/**
 * Returns an object with two properties, x and y, from a heavier FreehandHandleData object.
 * @private
 * @function getCoords
 *
 * @param {Object} dataHandle Data object associated with a single handle in the freehand tool.
 * @returns {Object} An object containing position propeties x and y.
 */
function getCoords(dataHandle) {
    return {
        x: dataHandle.x,
        y: dataHandle.y,
    };
}

/**
 * Checks the orientation of 3 points.
 * @private
 * @function orientation
 *
 * @param {Object} p First point.
 * @param {Object} q Second point.
 * @param {Object} r Third point.
 * @returns {number} - 0: Colinear, 1: Clockwise, 2: Anticlockwise
 */
function orientation(p, q, r) {
    const orientationValue =
        (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);

    if (orientationValue === 0) {
        return 0; // Colinear
    }

    return orientationValue > 0 ? 1 : 2;
}

/**
 * Checks if point q lines on the segment (p,r).
 * @private
 * @function onSegment
 *
 * @param {Object} p Point p.
 * @param {Object} q Point q.
 * @param {Object} r Point r.
 * @returns {boolean} - If q lies on line segment (p,r).
 */
function onSegment(p, q, r) {
    if (
        q.x <= Math.max(p.x, r.x) &&
        q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) &&
        q.y >= Math.min(p.y, r.y)
    ) {
        return true;
    }

    return false;
}
//dodane
/**
 * Adds the pixel to the workingSum if it is within the polygon.
 * @private
 * @method sumPointIfInFreehand
 *
 * @param {Object} dataHandles Data object associated with the tool.
 * @param {Object} point The pixel coordinates.
 * @param {Object} workingSum The working sum, squared sum and pixel count.
 * @param {Object} pixelValue The pixel value. // @modifies {workingSum}
 * @returns {undefined}
 */
function _sumPointIfInFreehand(dataHandles, point, workingSum, pixelValue) {
    if (_pointInFreehand(dataHandles, point)) {
        workingSum.value += pixelValue;
        workingSum.squared += pixelValue * pixelValue;
        workingSum.count++;
    }
}
function _getSum(sp, boundingBox, dataHandles) {
    const sum = {
        value: 0,
        squared: 0,
        count: 0,
    };
    let index = 0;
    
    for (let y = boundingBox.top; y < boundingBox.top + boundingBox.height; y++)

    {
        for (
            let x = boundingBox.left;
            x < boundingBox.left + boundingBox.width;
            x++
            
        ) {
            const point = {
                x,
                y,
            };
           
            _sumPointIfInFreehand(dataHandles, point, sum, sp[index]);
            index++;
        }
    }

    return sum;
}
function _calculateFreehandStatistics (sp, boundingBox, dataHandles) {
    const statisticsObj = {
        count: 0,
        mean: 0.0,
        variance: 0.0,
        stdDev: 0.0,
        sum: 0.0,
        min: 0.0,
        max: 0.0,
        pixels : 0.0,
        labelsToHistogram: 0.0,
        dataToHistogram: 0.0,
    };
    const sum = _getSum(sp, boundingBox, dataHandles);
    statisticsObj.pixels = sp;

    if (sum.count === 0) {
        return statisticsObj;
    }

    statisticsObj.count = sum.count;
    statisticsObj.mean = sum.value / sum.count;
    statisticsObj.variance =
        sum.squared / sum.count - statisticsObj.mean * statisticsObj.mean;
    statisticsObj.stdDev = Math.sqrt(statisticsObj.variance);
    statisticsObj.sum = sum;
    let min = null;
    let max = null;
    let index = 0;

    for (let y = boundingBox.top; y < boundingBox.top + boundingBox.height; y++) {
        for (let x = boundingBox.left; x < boundingBox.left + boundingBox.width; x++) {
            const point = {
                x,
                y,
            };
            if (_pointInFreehand(dataHandles, point)) {               
                min = Math.min(min, sp[index]);
                max = Math.max(max, sp[index]);
               
            }

            index++;
        }
    }

    statisticsObj.min = min;
    statisticsObj.max = max;

    var pixelValues = statisticsObj.pixels.sort();
    var groups = [];

    var k = Math.round(5 * Math.log10(statisticsObj.pixels.length));
    var WidthClass = Math.round((statisticsObj.max - statisticsObj.min) / k);

    var labelsMAX = [];
    var labelsMIN = [];


    for (var i = 0; i < k; i++) {
        groups[i] = 0;
    }

    for (var a = 0; a < groups.length; a++) {
        if (a == 0) {
            labelsMIN[a] = 0;
        }
        else {
            labelsMIN[a] = labelsMIN[a - 1] + WidthClass;
        }
    }

    for (var b = 0; b < groups.length; b++) {
        if (b == 0) {
            labelsMAX[b] = WidthClass;
        }
        else {
            labelsMAX[b] = labelsMAX[b - 1] + WidthClass;
        }
    }

    var labels = [];
    for (var c = 0; c < groups.length; c++) {
        labels[c] = labelsMIN[c] + '-' + labelsMAX[c];
    }

    for (var j = 0; j < pixelValues.length; j++) {

        for (var k = 0; k < (groups.length - 1); k++) {

            if (pixelValues[j] <= WidthClass * (k + 1) && pixelValues[j] > WidthClass * k) {
                groups[k]++;
            }

        }
        if (pixelValues[j] > WidthClass * (groups.length - 1)) {
            groups[groups.length - 1]++;
        }
    }
    statisticsObj.labelsToHistogram = labels;
    statisticsObj.dataToHistogram = groups;

    return statisticsObj;
}




function freehandArea(dataHandles, scaling) {
    let freeHandArea = 0;
    let j = dataHandles.length - 1; // The last vertex is the previous one to the first

    scaling = scaling || 1; // If scaling is falsy, set scaling to 1

    for (let i = 0; i < dataHandles.length; i++) {
        freeHandArea +=
            (dataHandles[j].x + dataHandles[i].x) *
            (dataHandles[j].y - dataHandles[i].y);
        j = i; // Here j is previous vertex to i
    }

    return Math.abs((freeHandArea * scaling) / 2.0);
}



function _pointInFreehand (dataHandles, location) {
    let inROI = false;

    // Cycle round pairs of points
    let j = dataHandles.length - 1; // The last vertex is the previous one to the first

    for (let i = 0; i < dataHandles.length; i++) {
        if (_rayFromPointCrosssesLine(location, dataHandles[i], dataHandles[j])) {
            inROI = !inROI;
        }

        j = i; // Here j is previous vertex to i
    }

    return inROI;
}

/**
 * Returns true if the y-position yp is enclosed within y-positions y1 and y2.
 * @private
 * @method
 * @name isEnclosedY
 *
 * @param {number} yp The y position of point p.
 * @param {number} y1 The y position of point 1.
 * @param {number} y2 The y position of point 2.
 * @returns {boolean} True if the y-position yp is enclosed within y-positions y1 and y2.
 */
function _isEnclosedY(yp, y1, y2) {
    if ((y1 < yp && yp < y2) || (y2 < yp && yp < y1)) {
        return true;
    }

    return false;
}

/**
 * Returns true if the line segment is to the right of the point.
 * @private
 * @method
 * @name isLineRightOfPoint
 *
 * @param {Object} point The point being queried.
 * @param {Object} lp1 The first point of the line segment.
 * @param {Object} lp2 The second point of the line segment.
 * @returns {boolean} True if the line is to the right of the point.
 */
function _isLineRightOfPoint(point, lp1, lp2) {
    // If both right of point return true
    if (lp1.x > point.x && lp2.x > point.x) {
        return true;
    }

    // Catch when line is vertical.
    if (lp1.x === lp2.x) {
        return point.x < lp1.x;
    }

    // Put leftmost point in lp1
    if (lp1.x > lp2.x) {
        const lptemp = lp1;

        lp1 = lp2;
        lp2 = lptemp;
    }
    const lPointY = _lineSegmentAtPoint(point, lp1, lp2);

    // If the lp1.x and lp2.x enclose point.x check gradient of line and see if
    // Point is above or below the line to calculate if it inside.
    if (
        Math.sign(lPointY.gradient) * point.y >
        Math.sign(lPointY.gradient) * lPointY.value
    ) {
        return true;
    }

    return false;
}

/**
 * Returns the y value of the line segment at the x value of the point.
 * @private
 * @method
 * @name lineSegmentAtPoint
 *
 * @param {Object} point The point being queried.
 * @param {Object} lp1 The first point of the line segment.
 * @param {Object} lp2 The second point of the line segment.
 * @returns {Object} An object containing the y value as well as the gradient of the line segment.
 */
function _lineSegmentAtPoint(point, lp1, lp2) {
    const dydx = (lp2.y - lp1.y) / (lp2.x - lp1.x);
    const fx = {
        value: lp1.y + dydx * (point.x - lp1.x),
        gradient: dydx,
    };

    return fx;
}

/**
 * Returns true if a rightwards ray originating from the point crosses the line defined by handleI and handleJ.
 * @private
 * @method
 * @name rayFromPointCrosssesLine
 *
 * @param {Object} point The point being queried.
 * @param {Object} handleI The first handle of the line segment.
 * @param {Object} handleJ The second handle of the line segment.
 * @returns {boolean} True if a rightwards ray originating from the point crosses the line defined by handleI and handleJ.
 */
function _rayFromPointCrosssesLine(point, handleI, handleJ) {
    if (
        _isEnclosedY(point.y, handleI.y, handleJ.y) &&
        _isLineRightOfPoint(point, handleI, handleJ)
    ) {
        return true;
    }

    return false;
}


 const _state = {
    // Global
    globalTools: {},
    globalToolChangeHistory: [],
    // Tracking
    enabledElements: [],
    tools: [],
    isToolLocked: false,
    activeMultiPartTool: null,
    mousePositionImage: {},
    // Settings
    clickProximity: 6,
    touchProximity: 10,
    handleRadius: 6,
    deleteIfHandleOutsideImage: true,
    preventHandleOutsideImage: false,
    // Cursor
    svgCursorUrl: null,
 };


function _setToolCursor(element, svgCursor) {
    if (!_globalConfiguration._configuration.showSVGCursors) {
        return;
    }
    // TODO: (state vs options) Exit if cursor wasn't updated
    // TODO: Exit if invalid options to create cursor

    // Note: Max size of an SVG cursor is 128x128, default is 32x32.
    const cursorBlob = svgCursor.getIconWithPointerSVG();
    const mousePoint = svgCursor.mousePoint;

    const svgCursorUrl = window.URL.createObjectURL(cursorBlob);

    element.style.cursor = `url('${svgCursorUrl}') ${mousePoint}, auto`;

    _state.svgCursorUrl = svgCursorUrl;
}

const _configuration = {
    mouseEnabled: true,
    touchEnabled: true,
    globalToolSyncEnabled: false,
    showSVGCursors: false,
    autoResizeViewports: true,
};

const _globalConfiguration=
{
    _configuration,
};


function _hideToolCursor(element) {
    if (!_globalConfiguration._configuration.showSVGCursors) {
        return;
    }

    _clearStateAndSetCursor(element, 'none');
}

function _clearStateAndSetCursor(element, cursorSeting) {
    if (_state.svgCursorUrl) {
        window.URL.revokeObjectURL(_state.svgCursorUrl);
    }

    _state.svgCursorUrl = null;
    element.style.cursor = cursorSeting;
}

//dodane z biblioteki
class FreehandHandleData {
    /**
     * Constructs a a single handle for the freehand tool
     *
     * @param {Object} position - The position of the handle.
     * @param {boolean} highlight - whether the handle should be rendered as the highlighted color.
     * @param {boolean} active - whether the handle is active.
     */
    constructor(position, highlight = true, active = true) {
        this.x = position.x;
        this.y = position.y;
        this.highlight = highlight;
        this.active = active;
        this.lines = [];
    }
}