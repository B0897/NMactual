const external = cornerstoneTools.importInternal('.cornerstoneTools/src/externalModules.js');
const BaseAnnotationTool = cornerstoneTools.importInternal('base/BaseAnnotationTool');

// State
const getToolState = cornerstoneTools.importInternal('stateManagement/toolState');
const toolStyle = cornerstoneTools.importInternal('stateManagement/toolStyle');
const toolColors = cornerstoneTools.importInternal('stateManagement/toolColors');

// Drawing
const  getNewContext  = cornerstoneTools.importInternal('drawing/getNewContext');
const draw = cornerstoneTools.importInternal('drawing/draw');
const drawHandles = cornerstoneTools.importInternal('drawing/drawHandles');
const drawRect = cornerstoneTools.importInternal('drawing/drawRect');
const drawLinkedTextBox = cornerstoneTools.importInternal('drawing/drawLinkedTextBox');
const setShadow = cornerstoneTools.importInternal('drawing/setShadow');
// Util
const calculateSUV = cornerstoneTools.importInternal('util/calculateSUV');
const getROITextBoxCoords = cornerstoneTools.importInternal('util/getROITextBoxCoords');
const numbersWithCommas = cornerstoneTools.importInternal('util/numbersWithCommas');
const throttle = cornerstoneTools.importInternal('util/throttle');
const rectangleRoiCursor = cornerstoneTools.importInternal('cursors/index');
const getLogger = cornerstoneTools.importInternal('util/logger');
const getPixelSpacing = cornerstoneTools.importInternal('util/getPixelSpacing');

/**
 * @public
 * @class RectangleRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing rectangular regions of interest, and measuring
 * the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
class RectangleModifiedTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'RectangleModified',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        drawHandles: true,
        // showMinMax: false,
        // showHounsfieldUnits: true
      },
      svgCursor: rectangleRoiCursor,
    };

    super(props, defaultProps);

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

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        start: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: false,
        },
        end: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true,
        },
        initialRotation: eventData.viewport.rotation,
		element: eventData.element,
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          },
      },
    };
  }

  pointNearTool(element, data, coords, interactionType) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    const distance = interactionType === 'mouse' ? 15 : 25;
    const startCanvas = cornerstone.pixelToCanvas(
      element,
      data.handles.start
    );
    const endCanvas = cornerstone.pixelToCanvas(
      element,
      data.handles.end
    );

    const rect = {
      left: Math.min(startCanvas.x, endCanvas.x),
      top: Math.min(startCanvas.y, endCanvas.y),
      width: Math.abs(startCanvas.x - endCanvas.x),
      height: Math.abs(startCanvas.y - endCanvas.y),
    };

    const distanceToPoint = cornerstoneMath.rect.distanceToPoint(
      rect,
      coords
    );

    //  const midCoords = _getMiddleCoords(data.handles.start, data.handles.end);
    return distanceToPoint < distance;
  }

    

  updateCachedStats(image, element, data) {
    const seriesModule =
      cornerstone.metaData.get('generalSeriesModule', image.imageId) ||
      {};
    const modality = seriesModule.modality;
      const pixelSpacing = getPixelSpacing(image);

      const midCoords = _getMiddleCoords(data.handles.start, data.handles.end);

    const stats = _calculateStats2(
      image,
        element,
        midCoords,
      data.handles,
      pixelSpacing
    );

    data.cachedStats = stats;
      data.invalidated = false;
     
      
  }

  renderToolData(evt) {
    const toolData = cornerstoneTools.getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    const eventData = evt.detail;
    const { image, element } = eventData;
    const lineWidth = cornerstoneTools.toolStyle.getToolWidth();
    const { handleRadius, drawHandlesOnHover } = this.configuration;
      const context =getNewContext(eventData.canvasContext.canvas);
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    // Meta
    const seriesModule =
      cornerstone.metaData.get('generalSeriesModule', image.imageId) ||
      {};

    // Pixel Spacing
    const modality = seriesModule.modality;
    const hasPixelSpacing = rowPixelSpacing && colPixelSpacing;

    draw(context, context => {
      // If we have tool data for this element - iterate over each set and draw it
      for (let i = 0; i < toolData.data.length; i++) {
        const data = toolData.data[i];

        if (data.visible === false) {
          continue;
        }

        // Configure
        const color = cornerstoneTools.toolColors.getColorIfActive(data);
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
        };

        setShadow(context, this.configuration);

        // Draw
        drawRect(
          context,
          element,
          data.handles.start,
          data.handles.end,
          {
            color,
          },
          'pixel',
          data.handles.initialRotation
        );

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        // Update textbox stats
        if (data.invalidated === true) {
          if (data.cachedStats) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        // Default to textbox on right side of ROI
        if (!data.handles.textBox.hasMoved) {
          const defaultCoords = getROITextBoxCoords(
            eventData.viewport,
            data.handles
          );

          Object.assign(data.handles.textBox, defaultCoords);
        }

        const textBoxAnchorPoints = handles =>
              _findTextBoxAnchorPoints(handles.start, handles.end);

         // const midCoords = handles => _getMiddleCoords(handles.start, handles.end);
          
          const textBoxContent = _createTextBoxContent2(
            i+1,
          context,
            image.color,
          //  midCoords,
          data.cachedStats,
          modality,
          hasPixelSpacing,
          this.configuration
        );

        data.unit = _getUnit(modality, this.configuration.showHounsfieldUnits);

        drawLinkedTextBox(
          context,
         element,
          data.handles.textBox,
          textBoxContent,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          10,
          true
        );
      }
    });
  }
}

/**
 * TODO: This is the same method (+ GetPixels) for the other ROIs
 * TODO: The pixel filtering is the unique bit
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {{ left: number, top: number, width: number, height: number}}
 */
function _getRectangleImageCoordinates(startHandle, endHandle) {
  return {
    left: Math.min(startHandle.x, endHandle.x),
    top: Math.min(startHandle.y, endHandle.y),
    width: Math.abs(startHandle.x - endHandle.x),
    height: Math.abs(startHandle.y - endHandle.y),
  };
}

function getOrigPixels(element, x, y, width, height) {
    if (element === undefined) {
        throw new Error('parameter element must not be undefined');
    }

    // zaokr¹glanie zmiennych x i y do liczb ca³kowitych
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
 
    return storedPixels;

}

/**
 * @param {*} image
 * @param {*} element
 * @param {*} handles
 * @param {*} pixelSpacing
 * @returns {Object} The Stats object
 */
function _calculateStats2(image, element,midCoords, handles, pixelSpacing) {
  // Retrieve the bounds of the rectangle in image coordinates
  const roiCoordinates = _getRectangleImageCoordinates(
    handles.start,
    handles.end
    );
  
    //const
        midCoords = _getMiddleCoords(handles.start, handles.end);

  // Retrieve the array of pixels that the rectangle bounds cover
  const pixels = getOrigPixels(
    element,
    roiCoordinates.left,
    roiCoordinates.top,
    roiCoordinates.width,
    roiCoordinates.height
  );
//console.log(pixels);
  // Calculate the mean & standard deviation from the pixels and the rectangle details
  const roiMeanStdDev = _calculateRectangleStats(pixels, roiCoordinates);

  let meanStdDevSUV;


  // Calculate the image area from the rectangle dimensions and pixel spacing
  const area =
    roiCoordinates.width *
    (pixelSpacing.colPixelSpacing || 1) *
    (roiCoordinates.height * (pixelSpacing.rowPixelSpacing || 1));

    var pixelValues = pixels.sort();
    var groups = [];

    var k = Math.round(5 * Math.log10(pixels.length));
    var WidthClass = Math.round((roiMeanStdDev.max - roiMeanStdDev.min) / k);

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


  return {
    area: area / 100 || 0,
      count: roiMeanStdDev.count || 0,
      sum: roiMeanStdDev.sum || 0,
    mean: roiMeanStdDev.mean || 0,
    variance: roiMeanStdDev.variance || 0,
    stdDev: roiMeanStdDev.stdDev || 0,
    min: roiMeanStdDev.min || 0,
    max: roiMeanStdDev.max || 0,
      meanStdDevSUV,
      midCoords: midCoords || 0,
      pixels: pixels || 0,
      labelsToHistogram: labels || 0,
      dataToHistogram: groups || 0
  };
}

/**
 *
 *
 * @param {*} sp
 * @param {*} rectangle
 * @returns {{ count: number,sum:number, mean: number,  variance: number,  stdDev: number,  min: number,  max: number }}
 */
function _calculateRectangleStats(sp, rectangle) {
	
	//aconsole.log(sp);
  let sum = 0;
  let sumSquared = 0;
  let count = 0;
  let index = 0;
  let min = sp ? sp[0] : null;
  let max = sp ? sp[0] : null;

  for (let y = rectangle.top; y < rectangle.top + rectangle.height; y++) {
    for (let x = rectangle.left; x < rectangle.left + rectangle.width; x++) {
      sum += sp[index];
      sumSquared += sp[index] * sp[index];
      min = Math.min(min, sp[index]);
      max = Math.max(max, sp[index]);
      count++; // TODO: Wouldn't this just be sp.length?
      index++;
    }
  }

  if (count === 0) {
    return {
        count,
        sum:0.0,
      mean: 0.0,
      variance: 0.0,
      stdDev: 0.0,
      min: 0.0,
      max: 0.0,
    };
  }

  const mean =sum / count;
  const variance = sumSquared / count - mean * mean;

  return {
      count,
      sum,
    mean,
    variance,
    stdDev: Math.sqrt(variance),
    min,
    max,
  };
}

/**
 *
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {Array.<{x: number, y: number}>}
 */
function _findTextBoxAnchorPoints(startHandle, endHandle) {
  const { left, top, width, height } = _getRectangleImageCoordinates(
    startHandle,
    endHandle
  );

  return [
    {
      // Top middle point of rectangle
      x: left + width / 2,
      y: top,
    },
    {
      // Left middle point of rectangle
      x: left,
      y: top + height / 2,
    },
    {
      // Bottom middle point of rectangle
      x: left + width / 2,
      y: top + height,
    },
    {
      // Right middle point of rectangle
      x: left + width,
      y: top + height / 2,
    },
  ];
}

///proba
function _getMiddleCoords(startHandle, endHandle) {
    if (startHandle.x < endHandle.x) {
        midx=startHandle.x + (Math.abs(endHandle.x - startHandle.x)/2)
    }
    else midx = endHandle.x + (Math.abs(startHandle.x - endHandle.x) / 2)

    if (startHandle.y < endHandle.y) {
        midy = startHandle.y + (Math.abs(endHandle.y - startHandle.y)/2)
    }
    else midy = endHandle.y + (Math.abs(startHandle.y - endHandle.y)/2)


    return [{
        x:Math.round(midx),
        y:Math.round(midy)
    }]
}



/**
 *
 *
 * @param {*} area
 * @param {*} hasPixelSpacing
 * @returns {string} The formatted label for showing area
 */
function _formatArea(area, hasPixelSpacing) {
  // This uses Char code 178 for a superscript 2
  const suffix = hasPixelSpacing
    ? ` cm${String.fromCharCode(178)}`
        : ` px${String.fromCharCode(178)}`;
    console.log('suffix: ' + suffix);
  return `Area: ${numbersWithCommas(area.toFixed(1))}${suffix}`;
}

function _getUnit(modality, showHounsfieldUnits) {
  return modality === 'CT' && showHounsfieldUnits !== false ? 'HU' : '';
}

/**
 * TODO: This is identical to EllipticalROI's same fn
 * TODO: We may want to make this a utility for ROIs with these values?
 *
 * @param {*} context
 * @param {*} isColorImage
 * @param {*} { area, mean, stdDev, min, max, meanStdDevSUV }
 * @param {*} modality
 * @param {*} hasPixelSpacing
 * @param {*} [options={}]
 * @returns {string[]}
 */
function _createTextBoxContent2(
    datalength,
  context,
    isColorImage,
   // midCoords,
    { area, sum, mean, stdDev, min, max, meanStdDevSUV, midCoords },
  modality,
  hasPixelSpacing,
  options = {}
) {

    const coordsLines = [];
  const textLines = [];

  const otherLines = [];

    const hasStandardUptakeValues = meanStdDevSUV && meanStdDevSUV.mean !== 0;
    const unit = _getUnit(modality, options.showHounsfieldUnits);
    //console.log(midCoords[0]);
      let meanString = `Mean: ${numbersWithCommas(mean.toFixed(2))} ${unit}`;
      let sumString = `Sum: ${sum} ${unit}`;
      let minString = `Min: ${min} ${unit}`;
      const maxString = `Max: ${max} ${unit}`;
    const midCoordsString = `(${midCoords[0].x},${midCoords[0].y}) `;
    const stdDevString = `Std Dev: ${numbersWithCommas(
      stdDev.toFixed(2)
    )} ${unit}`;

    let datalengthString = `ROI R${datalength}`;

    // If this image has SUV values to display, concatenate them to the text line
    if (hasStandardUptakeValues) {
      const SUVtext = ' SUV: ';

      const meanSuvString = `${SUVtext}${numbersWithCommas(
        meanStdDevSUV.mean.toFixed(2)
      )}`;
      const stdDevSuvString = `${SUVtext}${numbersWithCommas(
        meanStdDevSUV.stdDev.toFixed(2)
      )}`;

      const targetStringLength = Math.floor(
        context.measureText(`${stdDevString}     `).width
      );

      while (context.measureText(meanString).width < targetStringLength) {
        meanString += ' ';
      }

      otherLines.push(`${meanString}${meanSuvString}`);
        otherLines.push(`${stdDevString}     ${stdDevSuvString}`);

    } else {
        
        otherLines.push(`${sumString}`);
        otherLines.push(`${stdDevString}`);
        otherLines.push(`${meanString} `);
        otherLines.push(`${minString} `);
        otherLines.push(`${maxString}`);
      
    }

 
    textLines.push(`${datalengthString}  ${midCoordsString}`);
    textLines.push(_formatArea(area, hasPixelSpacing));
  otherLines.forEach(x => textLines.push(x));

    return textLines;
   
}
