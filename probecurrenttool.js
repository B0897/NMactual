// JavaScript source code

class ProbeCurrentTool extends BaseAnnotationTool {
    constructor(props = {}) {
        const defaultProps = {
            name: 'ProbeCurrent',
            supportedInteractionTypes: ['Mouse'/*, 'Touch'*/],
            //svgCursor: probeCursor,
            configuration: {
                drawHandles: true,
            },
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
                end: {
                    x: eventData.currentPoints.image.x,
                    y: eventData.currentPoints.image.y,
                    highlight: true,
                    active: true,
                },
            },
        };
    }
    /**
   *
   *
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
    pointNearTool(element, data, coords) {
        const hasEndHandle = data && data.handles && data.handles.end;
        const validParameters = hasEndHandle;

        if (!validParameters) {
            logger.warn(
                `invalid parameters supplied to tool ${this.name}'s pointNearTool`
            );
        }

        if (!validParameters || data.visible === false) {
            return false;
        }

        const probeCoords = cornerstone.pixelToCanvas(
            element,
            data.handles.end
        );

        return cornerstoneMath.point.distance(probeCoords, coords) < 5;
    }

    updateCachedStats(image, element, data) {
        const x = Math.round(data.handles.end.x);
        const y = Math.round(data.handles.end.y);

        const stats = {};

        if (x >= 0 && y >= 0 && x < image.columns && y < image.rows) {
            stats.x = x;
            stats.y = y;

            stats.storedPixels = _getOrigPixels(
                element,
                x,
                y,
                1,
                1
            );
            stats.sp = stats.storedPixels[0];
            stats.mo = stats.sp * image.slope + image.intercept;
            stats.suv = calculateSUV(image, stats.sp);
        }

        data.cachedStats = stats;
        data.invalidated = false;
    }


    renderToolData(evt) {
        const eventData = evt.detail;
        const { handleRadius } = this.configuration;
        const toolData = cornerstoneTools.getToolState(evt.currentTarget, this.name);

        if (!toolData) {
            return;
        }

        // We have tool data for this element - iterate over each one and draw it
        const context = getNewContext(eventData.canvasContext.canvas);
        const { image, element } = eventData;
        const fontHeight = cornerstoneTools.textStyle.getFontSize();

        for (let i = 0; i < toolData.data.length; i++) {
            const data = toolData.data[i];

            if (data.visible === false) {
                continue;
            }

            draw(context, context => {
                const color = cornerstoneTools.toolColors.getColorIfActive(data);

/*                if (this.configuration.drawHandles) {
                    // Draw the handles
                    drawHandles(context, eventData, data.handles, {
                        handleRadius,
                        color,
                    });
                }*/

                // Update textbox stats
                if (data.invalidated === true) {
                    if (data.cachedStats) {
                        this.throttledUpdateCachedStats(image, element, data);
                    } else {
                        this.updateCachedStats(image, element, data);
                    }
                }

                let text, str;

                const { x, y, storedPixels, sp, mo, suv } = data.cachedStats;

/*                if (x >= 0 && y >= 0 && x < image.columns && y < image.rows) {
                    text = `(${x}, ${y})`;

                    str = `SP: ${sp}`;// MO: ${parseFloat(mo.toFixed(3))}`;
                    if (suv) {
                        str += ` SUV: ${parseFloat(suv.toFixed(3))}`;

                    }

                    // Coords for text
                    const coords = {
                        // Translate the x/y away from the cursor
                        x: data.handles.end.x + 3,
                        y: data.handles.end.y - 3,
                    };
                    const textCoords = cornerstone.pixelToCanvas(
                        eventData.element,
                        coords
                    );

                    drawTextBox(
                        context,
                        str,
                        textCoords.x,
                        textCoords.y + fontHeight + 5,
                        color
                    );
                    drawTextBox(context, text, textCoords.x, textCoords.y, color);
                }*/
            });
        }
    }
}

function _getOrigPixels(element, x, y, width, height) {
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