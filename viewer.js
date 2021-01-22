/**
 * Orthanc - A Lightweight, RESTful DICOM Store
 * Copyright (C) 2012-2016 Sebastien Jodogne, Medical Physics
 * Department, University Hospital of Liege, Belgium
 * Copyright (C) 2017-2019 Osimis S.A., Belgium
 *
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 **/

//deklaracja zmiennych
var NumberOFImagesInSeries = 0;
var instances = [];

var currentImageDisplayIndex = 0;
var isFirst = true;
var compression = 'deflate';

var display = 0;
var current = 0;
var current1 = 0;
var current2 = 0;

var currentImageIndex = 0;

var colormapId = null;
var imageOrigPixels = null;
var modalityy = null;
var imageOrg = null;
var modalityMainImage = null;
var seriess = [];
var imagePixelSpacingColumn = 0;
var imagePixelSpacingRow = 0;
var imageMAX = [];
var imageMIN = [];
var imageColumns = 0;
var actionImage = 0;
var actionImage2 = 0;

var DynamicROI = [];

var NumberOfFrames = [];
var AllImages = [];
var TimeArray = [];
var FrameDuration = [];

var NameOfROI = [];
var NameOfROIToHistogram = [];

cornerstoneTools.init();
var fontFamily = ' Calibri';
cornerstoneTools.textStyle.setFont(`15px ${fontFamily}`);
cornerstoneTools.toolColors.setToolColor('rgb(255,140,0)');
$('#topleft1').hide();
$('#topleft2').hide();
$('#topright1').hide();
$('#topright2').hide();

$('#histROI').css('width', '0%');
$('#histR').css('width', '0%');
$('#hist').css('width', '0%');
$('#dynamicCurves').css('width', '0%');
$('#kidneyCurves').css('width', '0%');
$('#Results').css('width', '0%');
$('#dicomImageWrapper').css('width', '100%');

$('#dynCurves').hide();
$('#dynKidneyCurves').hide();
$('#dynBackgroundCurves').hide();
$('#dynKidneyCurvesGamma').hide();
$('#closeCurves').hide();
$('#closeKidneyCurves').hide();
$('#closeResults').hide();
$('#hist_image').hide();
$('#hist_roi1').hide();
$('#hist_roi2').hide();
$('#hist_roi3').hide();
$('#closeHistROI').hide();

$('#hist_rec1').hide();
$('#hist_rec2').hide();
$('#hist_rec3').hide();
$('#closeHistR').hide();

$('#hist_free1').hide();
$('#hist_free2').hide();
$('#hist_free3').hide();
$('#closeHistF').hide();
$('#deleteFROI').hide();

$('#result1').hide();
$('#result2').hide();
$('#result3').hide();

// Prevent the access to IE
if (navigator.appVersion.indexOf("MSIE ") != -1) {
    alert("Please use Mozilla Firefox or Google Chrome. Microsoft Internet Explorer is not supported.");
}

var leftKidney = [];
var leftKidneyCurve = [];
var rightKidney = [];
var rightKidneyCurve = [];
var rightLung = [];
var rightLungCurve = [];
var rightLungGammaIntegral = [];
var rightLungGammaIntegralLeftFitted = [];
var rightLungGammaIntegralRightFitted = [];
var aorta = [];
var aortaCurve = [];
var aortaGammaIntegral = [];
var aortaGammaIntegralLeftFitted = [];
var aortaGammaIntegralRightFitted = [];
var leftVentricle = [];
var leftVentricleCurve = [];
var leftVentricleGammaIntegral = [];
var leftVentricleGammaIntegralLeftFitted = [];
var leftVentricleGammaIntegralRightFitted = [];
var leftBackground = [];
var rigthBackground = [];

var patientWeight;
var patientHeight;
var GFR;
var FLOW;

var stage = 0;
function calculateKidney() {
    var temp;
    // TODO display ImageSum();

    // change button
    document.getElementById("Study").innerHTML = 'KS - continue';

    // turn off changing windowing
    if (actionImage == 0) {
        actionImage = 1;
        document.getElementById("wwwl").innerHTML = 'Turn on';
    }

    // stage  - stages of kidney study
    //0 -> outline leftKidney
    //1 -> outline rightKidney
    //2 -> outline rightLung
    //3 -> outline leftVentricle
    //4 -> outline aorta
    //5 -> save and draw Curves

    switch (stage) {
        case 0:
            outlineRegions("", "");
            document.getElementById("Study").innerHTML = 'KidneyStudy-Continue';
            break;
        case 1:
            temp = outlineRegions("leftKidney: ", "right kidney");
            leftKidney = temp.organ;
            leftKidneyCurve = temp.organCurve;
            break;
        case 2:
            temp = outlineRegions("rightKidney: ", "right lung part");
            rightKidney = temp.organ;
            rightKidneyCurve = temp.organCurve;
            break;
        case 3:
            temp = outlineRegions("rightLung: ", "left ventricle");
            rightLung = temp.organ;
            rightLungCurve = temp.organCurve;
            break;
        case 4:
            temp = outlineRegions("leftVentricle: ", "aorta");
            leftVentricle = temp.organ;
            leftVentricleCurve = temp.organCurve;
            document.getElementById("Study").innerHTML = 'KidneyStudy-Curves';
            break;
        case 5:
            temp = outlineRegions("aorta: ", "");
            aorta = temp.organ;
            aortaCurve= temp.organCurve;
            leftBackground = background('left');
            rightBackground = background('right');
            drawKidneyCurves();
            rightLungGammaIntegral = drawGammaFit(rightLungCurve, "right lung");
            document.getElementById("Study").innerHTML = 'KS - left Ventricle';
            break;
        case 6:
            leftVentricleGammaIntegral = drawGammaFit(leftVentricleCurve, "left ventricle");
            document.getElementById("Study").innerHTML = 'KS - aorta';
            break;
        case 7:
            aortaGammaIntegral = drawGammaFit(aortaCurve, "aorta");
            rightLungGammaIntegralLeftFitted = Pasow(leftKidneyCurve, rightLungGammaIntegral);
            leftVentricleGammaIntegralLeftFitted = Pasow(leftKidneyCurve, leftVentricleGammaIntegral);
            aortaGammaIntegralLeftFitted = Pasow(leftKidneyCurve, aortaGammaIntegral);
            rightLungGammaIntegralRightFitted = Pasow(rightKidneyCurve, rightLungGammaIntegral);
            leftVentricleGammaIntegralRightFitted = Pasow(rightKidneyCurve, leftVentricleGammaIntegral);
            aortaGammaIntegralRightFitted = Pasow(rightKidneyCurve, aortaGammaIntegral);
            document.getElementById("Study").innerHTML = 'KS - pasow(pn, p)';
            var KplKseKao = calcul();
            console.log("KplKseKao: " + KplKseKao);
            console.log("kplL: " + KplKseKao.kplL);
            console.log("kseL: " + KplKseKao.kseL);
            console.log("kaoL: " + KplKseKao.kaoL);
            console.log("kplR: " + KplKseKao.kplR);
            console.log("kseR: " + KplKseKao.kseR);
            console.log("kaoR: " + KplKseKao.kaoR);

            var cov = CalcCor();
            console.log("KplKseKao: " + cov);
            console.log("coeaL: " + cov.coeaL);
            console.log("coeaR: " + cov.coeaR);
            console.log("coehL: " + cov.coehL);
            console.log("coehR: " + cov.coehR);
            console.log("coelL: " + cov.coelL);
            console.log("coelR: " + cov.coelR);

            FLOW = doRestFlow(KplKseKao, cov);
            console.log(" ------------------- FLOW ------------------");
            console.log(" lung, heart, aorta ");
            console.log("left");
            console.log(FLOW.RightKidneyFlow.cpl, FLOW.RightKidneyFlow.cse, FLOW.RightKidneyFlow.cao);
            console.log("right");
            console.log(FLOW.RightKidneyFlow.cpl, FLOW.RightKidneyFlow.cpl, FLOW.RightKidneyFlow.cpl);
            console.log("total");
            console.log(FLOW.TotalFlow.cpl, FLOW.TotalFlow.cse, FLOW.TotalFlow.cao,);
            break;
        case 8:
            GFR = calcFiltration();
            console.log();
            console.log(" --------------- GFR -----------------------");
            console.log("GFR: " + GFR.gfr);
            console.log("GFRL: " + GFR.gfrl);
            console.log("GFRL: " + GFR.gfrr);

            console.log(" -----without cmake");
            //displayResults();

        case 9:
            console.log("watch out !!!!!!!!! disapearing results ");
            break;



        case 10:
            document.getElementById("Study").innerHTML = 'Kidney Study';
            stage = -1;
    }

    stage++;
}

function outlineRegions(textCurrentOrgan, textNextOrgan) {

    var organ = [];
    var organCurve = [];
    if (stage == 0) {
        var imageOk = confirm("All regions must visible on image : \n both kidneys, right lung part, left ventricle and aorta. ");
        if (!imageOk) {
            return;
        }

    } else {
        switch (roiOutlining) {
            case '1':
                for (var i = 0; i < NumberOfFrames; i++) {
                    organ[i] = calculateStatsEllipse(AllImages[i], dane.data[0].handles, imagePixelSpacingColumn, imagePixelSpacingRow);
                }
                break;
            case '2':
                for (var i = 0; i < NumberOfFrames; i++) {
                    organ[i] = calculateStatsRectangle(AllImages[i], daneR.data[0].handles, imagePixelSpacingColumn, imagePixelSpacingRow);
                }
                break;
            case '3':
                for (var i = 0; i < NumberOfFrames; i++) {
                    organ[i] = calculateFreehandStatistics(AllImages[i], daneF.data[0].handles.points, imagePixelSpacingColumn, imagePixelSpacingRow);
                }
                break;
        }
    }

    console.log(textCurrentOrgan + organ);

    if (stage == 1) {
        leftKidneyCoordinates = kidneyCoordinates;
        console.log(leftKidneyCoordinates);
    } else if (stage == 2) {
        rightKidneyCoordinates = kidneyCoordinates;
        console.log(rightKidneyCoordinates);
    }

    if (stage > 0) {
        for (var i = 0; i < NumberOfFrames; i++) {
            organCurve[i] = organ[i].sum / organ[i].area / FrameDuration[i];
        }
    }

    if (stage < 5) {
        chooseRoiOutliningTool(textNextOrgan);
    }
    dane = []; daneR = []; daneF = [];

    return { organ, organCurve };
}

var roiOutlining;
function chooseRoiOutliningTool(region) {

        // clear previous 
        var element = $('#dicomImage').get(0);
        cornerstoneTools.clearToolState(element, 'Probe');
        cornerstoneTools.clearToolState(element, 'Length');
        cornerstoneTools.clearToolState(element, 'Angle');
        cornerstoneTools.clearToolState(element, 'CobbAngle');
        cornerstoneTools.clearToolState(element, 'RectangleModified');
        cornerstoneTools.clearToolState(element, 'EllipticalModified');
        cornerstoneTools.clearToolState(element, 'FreehandModified');
        cornerstoneTools.clearToolState(element, 'TextMarker');
        $('#deleteFROI').hide();
        daneF = []; dane = []; daneR = [];
        cornerstone.updateImage(element);

    var choosen = false;
    while (!choosen) {
        roiOutlining = prompt(`Choose a tool and outline ${region}:\n\t1 - elipse\n\t2 - rectangle\n\t3 - freehand:`);
        switch (roiOutlining) {
            case '1':
                ElipticalRoiTool();
                choosen = true;
                break;
            case '2':
                RectangleRoiTool();
                choosen = true;
                break;
            case '3':
                FreehandRoiTool();
                choosen = true;
                break;
            default:
                alert(`not existing method ${roiOutlining}.\nPlease choose between "1" - elipse, "2" - rectangle or "3" - freehand`);
        }
    }
}

var myKidneyChart;
var myBackgroundChart;

function drawKidneyCurves() {
    $('#dicomImageWrapper').css('width', '50%');
    $('#kidneyCurves').css('width', '50%');
    var element = $('#dicomImage').get(0);
    cornerstone.resize(element);
    $('#dynKidneyCurves').show();
    $('#dynBackgroundCurves').show();
    $('#dynKidneyCurvesGamma').hide();
    $('#closeKidneyCurves').show();
    $('#bottomright1').css('right', '500px');
    $('#bottomright2').css('right', '500px');
    $('#bottomright3').css('right', '500px');
    $('#bottomright4').css('right', '500px');


    var DataToChart = [];
    var VectorToChart = [];

    if (myKidneyChart) {
        myKidneyChart.destroy();
    }
    if (myBackgroundChart) {
        myBackgroundChart.destroy();
    }

    var DynamicKidneyRoi = [];
    DynamicKidneyRoi[0] = leftKidney;
    DynamicKidneyRoi[1] = rightKidney;
    DynamicKidneyRoi[2] = rightLung;
    DynamicKidneyRoi[3] = leftVentricle;
    DynamicKidneyRoi[4] = aorta;
    DynamicKidneyRoi[5] = leftBackground;
    DynamicKidneyRoi[6] = rightBackground;


    //liczenie krzywej dla ka¿dego regionu
    for (var regno = 0; regno < 7; regno++) { // 5 regions

        var dataY = [];
        dataY[0] = 0;


        VectorToChart[0] = {
            x: 0,
            y: 0
        }

        for (var i = 0; i < DynamicKidneyRoi[regno].length-1; i++) {
            dataY[i] = DynamicKidneyRoi[regno][i].sum / DynamicKidneyRoi[regno][i].area / FrameDuration[i];    
            VectorToChart[i] = {
                x: TimeArray[i],
                y: dataY[i]
            }
        }
        DataToChart[regno] = VectorToChart;
        VectorToChart = [];
        dataY = [];
    }

    var labelOfRegno = ['left kidney', 'right kidney', 'right lung part', 'left ventricle', 'aorta', 'left Background', 'rightBackground'];

    var datasets1 = [];
    var colortable = ['blue', 'red', 'green', 'yellow', 'darkorange', 'darkorchid', 'gray', 'lightcoral'];

    //przygotowanie datasetu dla ka¿dego regionu
    for (var regno = 0; regno < 5; regno++) {
        datasets1[regno] = {
            label: labelOfRegno[regno],
            data: DataToChart[regno],
            showLine: true,
            fill: false,
            borderColor: colortable[regno % colortable.length],
            borderWidth: 1,
            pointBackgroundColor: colortable[regno % colortable.length],
            pointBorderColor: colortable[regno % colortable.length],
            pointRadius: 0.1,
            pointHoverRadius: 0.1
        };
    }

    //$('#dynKidneyCurves').show();
    var ctx = document.getElementById("dynKidneyCurves").getContext("2d");

    myKidneyChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            labels: TimeArray,
            datasets: datasets1
        },
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        fontSize: 9,
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Time [s]'
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontSize: 12
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Counts/s*cm^2'
                    }
                }],
            }
        }
    });

    var datasets2 = [];
    for (var regno = 5; regno < 7; regno++) {
        datasets2[regno-5] = {
            label: labelOfRegno[regno],
            data: DataToChart[regno],
            showLine: true,
            fill: false,
            borderColor: colortable[regno % colortable.length],
            borderWidth: 1,
            pointBackgroundColor: colortable[regno % colortable.length],
            pointBorderColor: colortable[regno % colortable.length],
            pointRadius: 0.1,
            pointHoverRadius: 0.1
        };
    }

    var ctx2 = document.getElementById("dynBackgroundCurves").getContext("2d");

    myBackgroundChart = new Chart(ctx2, {
        type: 'scatter',
        data: {
            labels: TimeArray,
            datasets: datasets2
        },
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        fontSize: 9,
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Time [s]'
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontSize: 12
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Counts/s*cm^2'
                    }
                }],
            }
        }
    });

    datasets1 = []; datasets2 = [];
}

var kidneyCoordinates;
var leftKidneyCoordinates;
var rightKidneyCoordinates;

function background(side) {

    var element = $('#dicomImage').get(0);
    cornerstoneTools.addTool(RectangleModifiedTool);
    cornerstoneTools.setToolActive('RectangleModified', { mouseButtonMask: 1 });

    element.addEventListener('cornerstonetoolsmouseup', function (event) {
        daneR = cornerstoneTools.getToolState(element, 'RectangleModified');
        console.log(cornerstoneTools.getToolState(element, 'RectangleModified'));

    });

    var imageStack = {
        currentImageIdIndex: 0,
        imageIds: instances[0],
    };
    cornerstoneTools.addStackStateManager(element, ['stack', 'RectangleModified']);
    cornerstoneTools.addToolState(element, 'stack', imageStack);


    var Q = [];
    for (var i = 0; i < NumberOfFrames; i++) {
        Q[i] = calculateStatsBackground(AllImages[i], imagePixelSpacingColumn, imagePixelSpacingRow, side);
    }

        cornerstoneTools.setToolPassive('RectangleModified', { mouseButtonMask: 1 });
        return Q;
}

function calculateStatsBackground(imagePixels, imagePixelSpacingColumn, imagePixelSpacingRow, side) {

    switch (side) {
        case 'right':
            var roiCoordinates = {
                'left': rightKidneyCoordinates.left - 1.5 * rightKidneyCoordinates.width,
                'top': rightKidneyCoordinates.top + 1.25 * rightKidneyCoordinates.height,
                'width': 0.25 * rightKidneyCoordinates.width,
                'height': 0.25 * rightKidneyCoordinates.height
            }
            break;
        case 'left':
            var roiCoordinates = {
                'left': leftKidneyCoordinates.left + 0.25 * leftKidneyCoordinates.width,
                'top': leftKidneyCoordinates.top + 1.25 * leftKidneyCoordinates.height,
                'width': 0.25 * leftKidneyCoordinates.width,
                'height': 0.25 * leftKidneyCoordinates.height
            }
            break;
    }


    // Retrieve the array of pixels that the rectangle bounds cover
    var pixels = getOrigPixelsOfImages(
        imagePixels,
        roiCoordinates.left,
        roiCoordinates.top,
        roiCoordinates.width,
        roiCoordinates.height
    );

    // Calculate the mean & standard deviation from the pixels and the rectangle details
    var roiMeanStdDev = _calculateRectangleStats(pixels, roiCoordinates);

    // Calculate the image area from the rectangle dimensions and pixel spacing
    var area =
        roiCoordinates.width *
        (imagePixelSpacingColumn || 1) *
        (roiCoordinates.height * (imagePixelSpacingRow || 1));

    return {
        area: Math.round(area / 100, 3) || 0,
        count: roiMeanStdDev.count || 0,
        sum: Math.round(roiMeanStdDev.sum, 3) || 0,
        mean: Math.round(roiMeanStdDev.mean, 3) || 0,
        stdDev: Math.round(roiMeanStdDev.stdDev, 3) || 0,
        min: Math.round(roiMeanStdDev.min, 3) || 0,
        max: Math.round(roiMeanStdDev.max, 3) || 0,
    };
}

var myGammaChart;
function drawGammaFit(organCurve, organLabel) {                                     //& odpowiednik Krzywa()

    $('#dicomImageWrapper').css('width', '65%');
    $('#kidneyCurves').css('width', '35%');
    var element = $('#dicomImage').get(0);
    cornerstone.resize(element);
    $('#dynKidneyCurves').show();
    $('#dynBackgroundCurves').show();
    $('#dynKidneyCurvesGamma').show();
    $('#closeKidneyCurves').show();
    $('#bottomright1').css('right', '420px');
    $('#bottomright2').css('right', '420px');
    $('#bottomright3').css('right', '420px');
    $('#bottomright4').css('right', '420px');

    if (myGammaChart) myGammaChart.destroy();

    console.log("Total study duration :" + TimeArray[TimeArray.length - 1]);

    // data constraint to first 40 s
    var end = frameAtTime(40);

    console.log("curve: " + organCurve + ", \ntime: " + TimeArray);
    console.log("GammaOrganArray: " + organCurve.slice(0, end) + ", \ntime: " + TimeArray.slice(0, end));

    // calculate gamma function aproximation vector

    //console.log("X: " + X + ", Y: " + Y + ", Z: " + Z);
    var gammaResult = gammaCoefficient(organCurve.slice(0, end), TimeArray.slice(0, end));
    console.log("A: " + gammaResult.A + " B: " + gammaResult.B + " C: " + gammaResult.C);
    console.log("gamma curve: " + gammaResult.curve);

    // create data to chart
    var VectorToChart = [];
    var VectorToChart1 = [];

    for (var i = 0; i < end; i++) {
        VectorToChart[i] = {
            x: TimeArray[i],
            y: organCurve[i]
        }
        VectorToChart1[i] = {
            x: TimeArray[i],
            y: gammaResult.curve[i]
        }
    }
    var DataToChart = [];
    DataToChart[0] = VectorToChart
    DataToChart[1] = VectorToChart1;
    VectorToChart = [];

    datasets3 = [];
    datasets3[0] = {
        label: organLabel+" - original curve",
        data: DataToChart[0],
        showLine: true,
        fill: false,
        borderColor: 'blue',
        borderWidth: 1,
        pointBackgroundColor: 'blue',
        pointBorderColor: 'blue',
        pointRadius: 0.1,
        pointHoverRadius: 0.1
    };
    datasets3[1] = {
        label: 'gamma aproximation',
        data: DataToChart[1],
        showLine: true,
        fill: false,
        borderColor: 'red',
        borderWidth: 1,
        pointBackgroundColor: 'red',
        pointBorderColor: 'red',
        pointRadius: 0.1,
        pointHoverRadius: 0.1
    };


    var ctx3 = document.getElementById("dynKidneyCurvesGamma").getContext("2d");

    myGammaChart = new Chart(ctx3, {
        type: 'scatter',
        data: {
            labels: TimeArray,
            datasets: datasets3
        },
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        fontSize: 9,
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Time [s]'
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontSize: 12
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Counts/s*cm^2'
                    }
                }],
            },
            annotation: {
                annotations: [{
                    type: 'line',
                    mode: 'vertical',
                    scaleID: 'x-axis-0',
                    value: 40,
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 4,
                    label: {
                        enabled: false,
                        content: 'Test label'
                    }
                }]
            }
        }
    })/*.LineWithLine(datasets3, {
        datasetFill: false,
        lineAtIndex: 20
    })*/;
    datasets3 = [];


    // create gamma vector for all study time
    var gammaOrganCurveAllStudy = [];
    var AA = gammaResult.A; var BB = gammaResult.B; var CC = gammaResult.C; var x = 0;
    console.log("AA: " + AA + " BB: " + BB + " CC: " + CC);
    for (var i = 0; i < TimeArray.length; i++) {
        //gammaOrganCurveAllStudy[i] = gammaResult.A * Math.pow(gammaResult.B * TimeArray[i]) * Math.exp(TimeArray[i] * gammaResult.C);
        x = TimeArray[i];
        gammaOrganCurveAllStudy[i] = AA * Math.pow(x, BB) * Math.exp(x * CC);
        console.log("x [t]: " + x + ",   gamAllStud: " + gammaOrganCurveAllStudy[i]);

    }
    console.log("gammaOrganCurveAllStudy :" + gammaOrganCurveAllStudy);

    var gammaOrganIntegral = [];
    var gammaCurveCopy = gammaOrganCurveAllStudy;
    gammaOrganIntegral[0] = gammaOrganCurveAllStudy[0];
    // count gamma integral
    for (var i = 1; i < TimeArray.length; i++) {
        gammaCurveCopy[i] += gammaCurveCopy[i - 1];
        gammaOrganIntegral[i] = gammaCurveCopy[i];
        console.log(" gammaIntegral [i]" + gammaOrganIntegral[i]);
    }
    console.log(gammaOrganIntegral);
    return gammaOrganIntegral;
}

function gammaCoefficient(curveArray, gammaTimeArray) {

    var A = gammaTimeArray.length;
    console.log("A: " + A);
    var max = 0; var maxIndex = 0;
    for (var i = 0; i < A; i++) {
        if (curveArray[i] > max) {
            max = curveArray[i];
            maxIndex = i;
        }
    }
    console.log("maxIndex: " + maxIndex);

    var firstMarker = maxIndex - 3;
    var secondMarker = maxIndex + 3;
    if (firstMarker < 0) { firstMarker = 0; }
    if (secondMarker > A-1) { secondMarker = A-1; }


    console.log("firstMarker: " + firstMarker +" secondMarker: " + secondMarker);

    var B = C = D = E = F = G = H = J = K = L = M = 0.0;
    var X = Y = Z = 0.0;
    // fit gamma
    console.log("zmienne " + B, C, D, E);

    var x, y, z;
    for (var i = firstMarker; i < secondMarker; i++) {
        x = gammaTimeArray[i], y = Math.log(curveArray[i]), z = Math.log(x);
        console.log(x);
		/*A*/	B += z, C += x, K += y,
		/*B*/	E += z * z, F += z * x, L += y * z,
		/*C*/	/*F*/	   J += x * x, M += y * x;
    }
    D = B, G = C, H = F;


    var	w;
    w = A * E * J + B * F * G + C * D * H - C * E * G - A * F * H - B * D * J;
    X = (K * (E * J - F * H) + L * (H * C - J * B) + M * (B * F - C * E)) / w;
    Y = (K * (F * G - D * J) + L * (J * A - G * C) + M * (C * D - A * F)) / w;
    Z = (K * (D * H - E * G) + L * (G * B - H * A) + M * (A * E - B * D)) / w;
    console.log(w);
    console.log("X " + X);
    console.log(Y, Z);


    X = Math.exp(X);

    var wrk = [];
    for (i = 0; i < curveArray.length; i++) {
        x = gammaTimeArray[i]; y = Math.pow(x, Y); z = Math.exp(Z * x);
        wrk[i] = X * y * z;
    }
    console.log(wrk);

    console.log("F.GAMMA = A * x ^ B * exp(C * x)")
    console.log("A: " + X + ", B: " + Y + ", C: " + Z);
    return {
        curve: wrk,
        A: X,
        B: Y,
        C: Z,
    };
}

function frameAtTime(seconds) {                                         //& odpowiednik Wybor()

    console.log("requested time: " + seconds);

    var maxTime = TimeArray[TimeArray.length-1];
    if (seconds > maxTime) {
        console.log("Study duration shorter than requested time");
        return TimeArray.length - 1;
    }
    var time = 0;
    var i;
    for (i = 0; time < seconds; i++) {
        time = TimeArray[i];
    }
    console.log("received time: " + time);
    return i;
}

function Pasow(kidney, organIntegral) {
    var end = frameAtTime(40);
    var sumak;
    var newCurve = [];
    var sumast = 1000000000;
    var sumaErr = 1000000000;
    console.log("organIntegral before shifting: " + organIntegral);
    // unshifting curve (->)
    var shiftableIntegral = organIntegral;
    organIntegral.shift();

    console.log("organIntegral after shifting: " + organIntegral);
    do {
        sumast = sumaErr;
        console.log("sumaErr: "+sumaErr)
        shiftableIntegral.unshift(0);
        shiftableIntegral.pop(); 

        console.log("organIntegral after unshifting: " + organIntegral);

        var k11 = 0;
        var k12 = 0;
        for (var i = 0; i < end; i++) {
            k11 += shiftableIntegral[i] * kidney[i];
            console.log("k11: " + k11);
            k12 += Math.pow(shiftableIntegral[i], 2)
            console.log("k12: " + k12);
        }

        if (k12 > 0.0001) sumak = k11 / k12;

        for (var i = 0; i < kidney.length; i++) {
            shiftableIntegral[i] = shiftableIntegral[i] * sumak;
            console.log("newCurve[i] "+ newCurve);
        }

        console.log("shiftableIntegral[] = " + shiftableIntegral);
        var newCurve2 = shiftableIntegral * sumak;
        console.log("newCurve2[] = " + newCurve2);

        var sumaErr = 0; var err = 0;
        for (var i = 0; i < end; i++) {
            err = Math.pow(shiftableIntegral[i] - kidney[i], 2);
            sumaErr += err;
        }
        console.log("sumaErr: " + sumaErr);
    } while (sumaErr < sumast);

    for (var i = 0; i < organIntegral.length - 1; i++) {
        shiftableIntegral[i] = shiftableIntegral[i + 1] / sumak;
    }
    shiftableIntegral[organIntegral.length - 1] = shiftableIntegral[organIntegral.length - 2];
    return shiftableIntegral;
}

function calcul() {
    //calcFlow poczatek
    var area = leftKidney[0].area; // TODO jakiego regionu


    if (!patientHeight) { patientHeight = prompt("Input patient's height:", ""); }
    if (!patientWeight) { patientWeight = prompt("Input patient's weight:", ""); }
    patientWeight = parseInt(patientWeight);
    patientHeight = parseInt(patientHeight);

    console.log("height: " + patientHeight + " weight: " + patientWeight);

    var mi = 0.153;
    var kor = [];
    kor[0] = Math.exp(mi * (13.2 * patientWeight / patientHeight + 0.7));
    kor[1] = Math.exp(mi * (13.3 * patientWeight / patientHeight + 0.7));

    console.log("kor " + kor);

    // calcul
    var maxLung = 0;
    var maxVentricle = 0;
    var maxAorta = 0;

    for (var i = 0; i < rightLungGammaIntegralLeftFitted.length; i++) {
        if (rightLungGammaIntegralLeftFitted[i] > maxLung) {
            maxLungL = rightLungGammaIntegralLeftFitted[i];
        }
        if (leftVentricleGammaIntegralLeftFitted[i] > maxVentricle) {
            maxVentricleL = leftVentricleGammaIntegralLeftFitted[i];
        }
        if (aortaGammaIntegralLeftFitted[i] > maxAorta) {
            maxAortaL = aortaGammaIntegralLeftFitted[i];
        }
        if (rightLungGammaIntegralRightFitted[i] > maxLung) {
            maxLungR = rightLungGammaIntegralRightFitted[i];
        }
        if (leftVentricleGammaIntegralRightFitted[i] > maxVentricle) {
            maxVentricleR = leftVentricleGammaIntegralRightFitted[i];
        }
        if (aortaGammaIntegralRightFitted[i] > maxAorta) {
            maxAortaR = aortaGammaIntegralRightFitted[i];
        }
    }
    console.log(" max lung ventricle aorta " + maxLungR, maxVentricleL, maxAortaL);

    var kplL = maxLungL * kor[0] * 60;
    var kseL = maxVentricleL * kor[0] * 60;
    var kaoL = maxAortaL * kor[0] * 60;

    var kplR = maxLungR * kor[1] * 60;
    var kseR = maxVentricleR * kor[1] * 60;
    var kaoR = maxAortaR * kor[1] * 60;
    console.log(kplL);
    console.log("kseL " + kseL);
    console.log("kaoL "+kaoL);
    console.log("kplR " + kplR);
    console.log("kseR " + kseR);
    console.log("kaoR " + kaoR);

    return { kplL, kseL, kaoL, kplR, kseR, kaoR}
}

function CalcCor() {
    var start = 0;
    var end = frameAtTime(40);
    var meankL = 0; var meanlL = 0;
    var meanhL = 0; var meanaL = 0;
    var meankR = 0; var meanlR = 0;
    var meanhR = 0; var meanaR = 0;
    var meankR = 0;
    for (var i = start; i < end; i++) {
        meankL += leftKidneyCurve[i];
        meankR += rightKidneyCurve[i];
        meanlL += rightLungGammaIntegralLeftFitted[i];
        meanhL += leftVentricleGammaIntegralLeftFitted[i];
        meanaL += aortaGammaIntegralLeftFitted[i];
        meanlR += rightLungGammaIntegralRightFitted[i];
        meanhR += leftVentricleGammaIntegralRightFitted[i];
        meanaR += aortaGammaIntegralRightFitted[i];
    }

    var dl = end - start + 1;
    meankL /= dl;
    meankR /= dl;
    meanlL /= dl;
    meanhL /= dl;
    meanaL /= dl;
    meanlR /= dl;
    meanhR /= dl;
    meanaR /= dl;

    // ------------------------- variance
    var varkL = 0; var varkR = 0;
    var varlL = 0; var varhL = 0;
    var varaL = 0;
    var varlR = 0; var varhR = 0;
    var varaR = 0;
    for (var i = start; i < end; i++) {
        varkL += Math.pow((leftKidneyCurve[i] - meankL), 2);
        varkR += Math.pow((rightKidneyCurve[i] - meankR), 2);
        varlL += Math.pow((rightLungGammaIntegralLeftFitted[i] - meanlL), 2);
        varhL += Math.pow((leftVentricleGammaIntegralLeftFitted[i] - meanhL), 2);
        varaL += Math.pow((aortaGammaIntegralLeftFitted[i] - meanaL), 2);
        varlR += Math.pow((rightLungGammaIntegralRightFitted[i] - meanlR), 2);
        varhR += Math.pow((leftVentricleGammaIntegralRightFitted[i] - meanhR), 2);
        varaR += Math.pow((aortaGammaIntegralRightFitted[i] - meanaR), 2);
    }
    // ------------------------- covariance
    var covlL = 0; var covlR = 0;
    var covhL = 0; var covhR = 0;
    var covaL = 0; var covaR = 0;

    for (var i = start; i < end; i++) {
        covlL += (leftKidneyCurve[i] - meankL) * (rightLungGammaIntegralLeftFitted[i] - meanlL);
        covlR += (rightKidneyCurve[i] - meankR) * (rightLungGammaIntegralRightFitted[i] - meanlR);
        covhL += (leftKidneyCurve[i] - meankL) * (leftVentricleGammaIntegralLeftFitted[i] - meanhL);
        covhR += (rightKidneyCurve[i] - meankR) * (leftVentricleGammaIntegralRightFitted[i] - meanhR);
        covaL += (leftKidneyCurve[i] - meankL) * (aortaGammaIntegralLeftFitted[i] - meanaL);
        covaR += (rightKidneyCurve[i] - meankR) * (aortaGammaIntegralRightFitted[i] - meanaR);
    }


    var coelL = covlL / Math.sqrt(varkL * varlL);
    var coehL = covhL / Math.sqrt(varkL * varhL);
    var coeaL = covaL / Math.sqrt(varkL * varaL);

    var coelR = covlR / Math.sqrt(varkR * varlR);
    var coehR = covhR / Math.sqrt(varkR * varhR);
    var coeaR = covaR / Math.sqrt(varkR * varaR);

    return {
        coelL: coelL,
        coehL: coehL,
        coeaL: coeaL,
        coelR: coelR,
        coehR: coehR,
        coeaR: coeaR,
    }
}

function doRestFlow(kplksekao, covariance) {

    var areaL = leftKidney[0].area;
    var areaR = rightKidney[0].area;

    var LeftKidneyFlow = {
        cpl: covariance.coelL,
        cse: covariance.coehL,
        cao: covariance.coeaL,
        pl: kplksekao.kplL * 100 / areaL,
        se: kplksekao.kseL * 100 / areaL,
        ao: kplksekao.kaoL * 100 / areaL
    }

    var RightKidneyFlow = {
        cpl: covariance.coelR,
        cse: covariance.coehR,
        cao: covariance.coeaR,
        pl: kplksekao.kplR * 100 / areaR,
        se: kplksekao.kseR * 100 / areaR,
        ao: kplksekao.kaoR * 100 / areaR
    }

    var TotalFlow = {
        pl: LeftKidneyFlow.pl + RightKidneyFlow.pl,
        se: LeftKidneyFlow.se + RightKidneyFlow.se,
        ao: LeftKidneyFlow.ao + RightKidneyFlow.ao,
        cpl: (LeftKidneyFlow.cpl + RightKidneyFlow.cpl)/2,
        cse: (LeftKidneyFlow.cse + RightKidneyFlow.cse) / 2,
        cao: (LeftKidneyFlow.cao + RightKidneyFlow.cao) / 2
    }
    console.log("leftKidneyFlow: " + LeftKidneyFlow);
    console.log("righttKidneyFlow: " + RightKidneyFlow);

    return { LeftKidneyFlow, RightKidneyFlow, TotalFlow }
}

function calcFiltration() {

    // calculating background curves
    var leftBackgroundCurve = [];
    var rightBackgroundCurve = [];
    for (var i = 0; i < NumberOfFrames; i++) {
        leftBackgroundCurve[i] = leftBackground[i].sum / leftBackground[i].area / FrameDuration[i];
        rightBackgroundCurve[i] = rightBackground[i].sum / rightBackground[i].area / FrameDuration[i];
    }

    var start = frameAtTime(3 * 60) - 5;
    if (start < 0) start = 0;

    var end = frameAtTime(3 * 60) - 5;
    if (end > NumberOfFrames - 1) end = NumberOfFrames - 1;

    // paralel
    var int1 = 0; var int2 = 0; var int3 = 0;
    for (var i = start; i < end; i++) {
        int1 += leftKidneyCurve[i] - leftBackgroundCurve[i] * leftKidney[0].area;
        int2 += rightKidneyCurve[i] - rightBackgroundCurve[i] * rightKidney[0].area;
        int3 = 0; //TODO zerowy bufor
    }

    var jj = end - start + 1;
    int1 = int1 * 60 / jj;
    int2 = int2 * 60 / jj;
    int3 = int3 * 99 * 60 / jj; // TODO 99 - area of bufor 0

    var mi = 0.153;
    var xrk = 13.3 * patientWeight / patientHeight + 0.7;
    var xlk = 13.2 * patientWeight / patientHeight + 0.7;
    var rk = int2 * Math.exp(mi * xrk);
    var lk = int1 * Math.exp(mi * xlk);
    var upt = (rk + lk) / int3 * 100;
    var uptl = lk / int3 * 100;
    var uptr = rk / int3 * 100;
    var gfr = upt * 9.8127 - 6.82519;
    if (gfr < 0)
        gfr = 0;
    var gfrl = uptl / upt * gfr;
    var gfrr = uptr / upt * gfr;

    return {
        gfr: gfr,
        gfrl: gfrl,
        gfrr: gfrr
    }
}

var result1Chart = [];
var result2Chart = [];
var result3Chart = [];
/*
function displayResults() {

    console.log("started displayResult function");

    $('#dicomImageWrapper').css('width', '20%');
    $('#kidneyCurves').css('width', '30%');
    $('#kidneyCurves').css('width', '50%');
    var element = $('#dicomImage').get(0);
    cornerstone.resize(element);
    $('#dynKidneyCurves').show();
    $('#dynBackgroundCurves').show();
    $('#dynKidneyCurvesGamma').show();
    $('#closeKidneyCurves').show();
    $('#result1').show();
    $('#result2').show();
    $('#result3').show();
    $('#closeResults').show();
    $('#bottomright1').css('right', '800px');
    $('#bottomright2').css('right', '800px');
    $('#bottomright3').css('right', '800px');
    $('#bottomright4').css('right', '800px');

    var VectorToChartKidney1 = [];
    var VectorToChartKidney2 = [];

    VectorToChartKidney1[0] = {
        x: 0,
        y: 0
    }
    VectorToChartKidney2[0] = {
        x: 0,
        y: 0
    }

    var end = frameAtTime(40);
    for (var i = 0; i < end; i++) {
        VectorToChartKidney1[i] = {
            x: leftKidneyCurve[i],
            y: leftKidneyCurve[i]
        }
        VectorToChartKidney2[i] = {
            x: TimeArray[i],
            y: rightKidneyCurve[i]
        }
    }



    var labelOfRegno = ['left kidney', 'right kidney', 'right lung part', 'left ventricle', 'aorta', 'left Background', 'rightBackground'];
    var colortable = ['blue', 'red', 'green', 'yellow', 'darkorange', 'darkorchid', 'gray', 'lightcoral'];
    var dataset = [];
    //przygotowanie datasetu dla ka¿dego regionu

        dataset[0] = {
            label: labelOfRegno[0],
            data: VectorToChartKidney1,
            showLine: true,
            fill: false,
            borderColor: colortable[0],
            borderWidth: 1,
            pointBackgroundColor: colortable[0],
            pointBorderColor: colortable[0],
            pointRadius: 0.1,
            pointHoverRadius: 0.1
        };
    dataset[1] = {
        label: labelOfRegno[1],
        data: VectorToChartKidney2,
        showLine: true,
        fill: false,
        borderColor: colortable[1],
        borderWidth: 1,
        pointBackgroundColor: colortable[1],
        pointBorderColor: colortable[1],
        pointRadius: 0.1,
        pointHoverRadius: 0.1
    };

    var ctx1 = document.getElementById("result1").getContext("2d");

    result1Chart = new Chart(ctx1, {
        type: 'scatter',
        data: {
            labels: TimeArray,
            datasets: dataset
        },
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        fontSize: 9,
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Time [s]'
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontSize: 12
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Counts/s*cm^2'
                    }
                }],
            }
        }
    });

    document.getElementById("1").innerHTML = 'by lung: ' + FLOW.LeftKidneyFlow.cpl;
    document.getElementById("2").innerHTML = 'by heart: ' + FLOW.LeftKidneyFlow.cse;
    document.getElementById("3").innerHTML = 'by aorta: ' + FLOW.LeftKidneyFlow.cao;

    document.getElementById("4").innerHTML = 'by lung: ' + FLOW.RightKidneyFlow.cpl;
    document.getElementById("5").innerHTML = 'by heart: ' + FLOW.RightKidneyFlow.cse;
    document.getElementById("6").innerHTML = 'by aorta: ' + FLOW.RightKidneyFlow.cao;

    document.getElementById("7").innerHTML = 'left kidney: ' + GFR.gfrl;
    document.getElementById("8").innerHTML = 'right kidney: ' + GFR.gfrr
    document.getElementById("9").innerHTML = 'both: ' + GFR.gfr;

    var div = document.getElementById("one");
    var img = div.toDataURL("image/png");
    document.write('<img src="' + img + '"/>');
}
*/
/*
class MyScale {

}
MyScale.id = 'myScale';
MyScale.defaults = defaultConfigObject;
Chart.register(MyScale);*/


function ResizeCornerstone() {
    $('#dicomImage').height($(window).height() - $('#slider').parent().height());
    var element = $('#dicomImage').get(0);
    cornerstone.resize(element, true);
}

function SetWindowing(center, width) {
    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    viewport.voi.windowCenter = center;
    viewport.voi.windowWidth = width;
    cornerstone.setViewport(element, viewport);
    UpdateViewportInformation();
}

function SetFullWindowing() {
    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    var image = cornerstone.getEnabledElement(element).image;

    if (image.color) {
        // Ignore color images
        return;
    }

    var minValue = image.minPixelValue;
    var maxValue = image.maxPixelValue;
    if (minValue == undefined ||
        maxValue == undefined ||
        minValue == maxValue) {
        return;
    }

    if (image.slope != undefined &&
        image.intercept != undefined) {
        minValue = minValue * image.slope + image.intercept;
        maxValue = maxValue * image.slope + image.intercept;
    }

    viewport.voi.windowCenter = (minValue + maxValue) / 2.0;
    viewport.voi.windowWidth = (maxValue - minValue) / 2.0;
    cornerstone.setViewport(element, viewport);
    UpdateViewportInformation();
}

function SetDefaultWindowing() {
    var element = $('#dicomimage').get(0);
    var viewport = cornerstone.getViewport(element);
    var image = cornerstone.getEnabledElement(element).image;

    viewport.voi.windowcenter = image.windowcenter;
    viewport.voi.windowwidth = image.windowwidth;
    cornerstone.setViewport(element, viewport);
    UpdateViewportInformation();

}

function TurnOffChanging() {
    if (actionImage == 0) {
        actionImage = 1;
        document.getElementById("wwwl").innerHTML = 'Turn on';
    }
    else {
        actionImage = 0;
        document.getElementById("wwwl").innerHTML = 'Turn off';
    }
}

function TurnOffChanging2() {
    if (actionImage2 == 0) {
        actionImage2 = 1;
        document.getElementById("wwwl2").innerHTML = 'Turn on windowing';

    }
    else {
        actionImage2 = 0;
        document.getElementById("wwwl2").innerHTML = 'Turn off windowing';

    }
}

function sort_unique(arr) {
    return arr.sort().filter(function (el, i, a) {
        return (i == a.indexOf(el));
    });
}

function UpdateViewportInformation() {

    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    var image = cornerstone.getEnabledElement(element).image;
    $('#bottomright1').text('WW/WL:' + Math.round(viewport.voi.windowWidth) + '/' + Math.round(viewport.voi.windowCenter));
    $('#bottomright2').text('Zoom: ' + viewport.scale.toFixed(2) + 'x');
    $('#bottomright3').text('Min: ' + imageMIN[currentImageIndex] + ' Max: ' + imageMAX[currentImageIndex]);
    $('#bottomright4').text('Image Size: ' + image.height + ' x ' + image.width);
   
}

function UpdateViewportInformation1() {
    var element1 = $('#dicomImage1').get(0);
    var viewport1 = cornerstone.getViewport(element1);
    var image1 = cornerstone.getEnabledElement(element1).image;
    $('#bottomright1_1').text('WW/WL:' + Math.round(viewport1.voi.windowWidth) + '/' + Math.round(viewport1.voi.windowCenter));
    $('#bottomright2_1').text('Zoom: ' + viewport1.scale.toFixed(2) + 'x');
    $('#bottomright3_1').text('Min: ' + image1.minPixelValue + ' Max: ' + image1.maxPixelValue);
    $('#bottomright4_1').text('Image Size: ' + image1.height + ' x ' + image1.width);  
}

function UpdateViewportInformation2() {
    var element2 = $('#dicomImage2').get(0);
    var viewport2 = cornerstone.getViewport(element2);
    var image2 = cornerstone.getEnabledElement(element2).image;
    $('#bottomright1_2').text('WW/WL:' + Math.round(viewport2.voi.windowWidth) + '/' + Math.round(viewport2.voi.windowCenter));
    $('#bottomright2_2').text('Zoom: ' + viewport2.scale.toFixed(2) + 'x');
    $('#bottomright3_2').text('Min: ' + image2.minPixelValue + ' Max: ' + image2.maxPixelValue);
    $('#bottomright4_2').text('Image Size: ' + image2.height + ' x ' + image2.width);
}

function ToggleSeriesInformation() {
    $('#topleft').toggle();
    $('#topright').toggle();
    $('#bottomleft').toggle();
}

function ToggleInterpolation() {
    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    if (viewport.pixelReplication === true) {
        viewport.pixelReplication = false;
    } else {
        viewport.pixelReplication = true;
    }
    cornerstone.setViewport(element, viewport);
}

function ToggleInversion() {
    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    if (viewport.invert === true) {
        viewport.invert = false;
    } else {
        viewport.invert = true;
    }
    cornerstone.setViewport(element, viewport);
}

function ZoomIn() {

    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    viewport.scale /= 0.5;
    cornerstone.setViewport(element, viewport);
    UpdateViewportInformation();

}

function ZoomOut() {
    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    viewport.scale *= 0.5;
    cornerstone.setViewport(element, viewport);
    UpdateViewportInformation();


}

function Rotation() {
    var element = $('#dicomImage').get(0);
    var viewport = cornerstone.getViewport(element);
    viewport.rotation += 90;
    cornerstone.setViewport(element, viewport);
    UpdateViewportInformation();
}

function getOrigPixelsOfImages(imagePixels, x, y, width, height) {
    if (imagePixels === undefined) {
        throw new Error('parameter image must not be undefined');
    }
    // zaokr¹glanie zmiennych x i y do liczb ca³kowitych
    x = Math.round(x);
    y = Math.round(y);

    var storedPixels = [];
    var index = 0;
    var pixelData = null;
    pixelData = imagePixels;//image.getPixelData();

    for (var row = 0; row < height; row++) {
        for (var column = 0; column < width; column++) {
            var spIndex = ((row + y) * imageColumns) + (column + x);
            storedPixels[index++] = pixelData[spIndex];
        }
    }
    return storedPixels;
}

// funkcja wyliczajaca parametry rectangle ROI (u¿ywana w krzywych dynamicznych)
function calculateStatsRectangle(imagePixels, handles, imagePixelSpacingColumn, imagePixelSpacingRow) {
    // Retrieve the bounds of the rectangle in image coordinates

    var roiCoordinates = _getRectangleImageCoordinates(
        handles.start,
        handles.end
    );

    // Retrieve the array of pixels that the rectangle bounds cover
    var pixels = getOrigPixelsOfImages(
        imagePixels,
        roiCoordinates.left,
        roiCoordinates.top,
        roiCoordinates.width,
        roiCoordinates.height
    );

    //save coordinates for kidney background
    kidneyCoordinates = {
        'left': roiCoordinates.left,
        'top': roiCoordinates.top,
        'width': roiCoordinates.width,
        'height': roiCoordinates.height
    }
    // Calculate the mean & standard deviation from the pixels and the rectangle details
    var roiMeanStdDev = _calculateRectangleStats(pixels, roiCoordinates);

    // Calculate the image area from the rectangle dimensions and pixel spacing
    var area =
        roiCoordinates.width *
        (imagePixelSpacingColumn || 1) *
        (roiCoordinates.height * (imagePixelSpacingRow || 1));

    return {
        area: Math.round(area / 100, 3) || 0,
        count: roiMeanStdDev.count || 0,
        sum: Math.round(roiMeanStdDev.sum, 3) || 0,
        mean: Math.round(roiMeanStdDev.mean, 3) || 0,
        stdDev: Math.round(roiMeanStdDev.stdDev, 3) || 0,
        min: Math.round(roiMeanStdDev.min, 3) || 0,
        max: Math.round(roiMeanStdDev.max, 3) || 0,
    };
}

// funkcja wyliczajaca parametry elipse ROI (u¿ywana w krzywych dynamicznych)
function calculateStatsEllipse(imagePixels, handles, imagePixelSpacingColumn, imagePixelSpacingRow) {
    // Retrieve the bounds of the rectangle in image coordinates

    var roiCoordinates = _getEllipseImageCoordinates(
        handles.start,
        handles.end
    );

    // Retrieve the array of pixels that the rectangle bounds cover
    var pixels = getOrigPixelsOfImages(
        imagePixels,
        roiCoordinates.left,
        roiCoordinates.top,
        roiCoordinates.width,
        roiCoordinates.height
    );

    kidneyCoordinates = {
        'left': roiCoordinates.left,
        'top': roiCoordinates.top,
        'width': roiCoordinates.width,
        'height': roiCoordinates.height
    }

    // Calculate the mean & standard deviation from the pixels and the rectangle details
    var roiMeanStdDev = _calculateEllipseStatistics(pixels, roiCoordinates);

    // Calculate the image area from the rectangle dimensions and pixel spacing
    var area =
        roiCoordinates.width *
        (imagePixelSpacingColumn || 1) *
        (roiCoordinates.height * (imagePixelSpacingRow || 1));

    return {
        area: Math.round(area / 100, 3) || 0,
        count: roiMeanStdDev.count || 0,
        sum: Math.round(roiMeanStdDev.sum, 3) || 0,
        mean: Math.round(roiMeanStdDev.mean, 3) || 0,
        stdDev: Math.round(roiMeanStdDev.stdDev, 3) || 0,
        min: Math.round(roiMeanStdDev.min, 3) || 0,
        max: Math.round(roiMeanStdDev.max, 3) || 0,
    };
}

// funkcja wyliczajaca parametry freehand ROI (u¿ywana w krzywych dynamicznych)
function calculateFreehandStatistics(imagePixels, ROIpoints, columnPixelSpacing, rowPixelSpacing) {

    var points = ROIpoints;
    var scaling = columnPixelSpacing * rowPixelSpacing;
    var area = freehandArea(ROIpoints, scaling);
    // Retrieve the bounds of the ROI in image coordinates
    var bounds = {
        left: points[0].x,
        right: points[0].x,
        bottom: points[0].y,
        top: points[0].y,
    };

    for (var i = 0; i < points.length; i++) {
        bounds.left = Math.min(bounds.left, points[i].x);
        bounds.right = Math.max(bounds.right, points[i].x);
        bounds.bottom = Math.min(bounds.bottom, points[i].y);
        bounds.top = Math.max(bounds.top, points[i].y);
    }

    var polyBoundingBox = {
        left: bounds.left,
        top: bounds.bottom,
        width: Math.abs(bounds.right - bounds.left),
        height: Math.abs(bounds.top - bounds.bottom),
    };

    var pixels = getOrigPixelsOfImages(
        imagePixels,
        polyBoundingBox.left,
        polyBoundingBox.top,
        polyBoundingBox.width,
        polyBoundingBox.height
    );

    kidneyCoordinates = {
        'left': polyBoundingBox.left,
        'top': polyBoundingBox.top,
        'width': polyBoundingBox.width,
        'height': polyBoundingBox.height
    }

    var statisticsObj = {
        count: 0,
        mean: 0.0,
        variance: 0.0,
        stdDev: 0.0,
        sum: 0.0,
        min: 0.0,
        max: 0.0,
        area: 0.0,
    };
    var sum = _getSum(pixels, polyBoundingBox, ROIpoints);

    // statisticsObj.pixels = pixels;

    if (sum.count === 0) {
        return statisticsObj;
    }

    statisticsObj.count = sum.count;
    statisticsObj.mean = sum.value / sum.count;
    statisticsObj.variance =
        sum.squared / sum.count - statisticsObj.mean * statisticsObj.mean;
    statisticsObj.stdDev = Math.sqrt(statisticsObj.variance);
    statisticsObj.sum = sum.value;
    var min = null;
    var max = null;

    min = Math.min.apply(null, pixels);
    max = Math.max.apply(null, pixels);

    statisticsObj.min = min;
    statisticsObj.max = max;
    statisticsObj.area = area / 100;

    return statisticsObj;
}

function LengthTool() {

    cornerstoneTools.addTool(LengthModifiedTool);
    cornerstoneTools.setToolActive('LengthModified', { mouseButtonMask: 1 });
}

function ProbeTool() {

    cornerstoneTools.addTool(ProbeModifiedTool);
    cornerstoneTools.setToolActive('ProbeModified', { mouseButtonMask: 1 });
}

function AngleTool() {

    var AngleTool = cornerstoneTools.AngleTool;
    cornerstoneTools.addTool(AngleTool);
    cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
}

// funkcja do rysowania prostokatnego ROI - wywolywana po nacisnieciu przycisku Rectangle ROI
var daneR = [];
function RectangleRoiTool() {
    if (actionImage == 0) {
        actionImage = 1;
        document.getElementById("wwwl").innerHTML = 'Turn on';
    }
    var element = $('#dicomImage').get(0);
    cornerstoneTools.addTool(RectangleModifiedTool);
    cornerstoneTools.setToolActive('RectangleModified', { mouseButtonMask: 1 });

    element.addEventListener('cornerstonetoolsmouseup', function (event) {
        daneR = cornerstoneTools.getToolState(element, 'RectangleModified');
        console.log(cornerstoneTools.getToolState(element, 'RectangleModified'));     

    });

    var imageStack = {
        currentImageIdIndex: 0,
        imageIds: instances[0],
    };
    cornerstoneTools.addStackStateManager(element, ['stack', 'RectangleModified']);
    cornerstoneTools.addToolState(element, 'stack', imageStack);
}

// funkcja do rysowania ellipse ROI - wywolywana po nacisnieciu przycisku Eliptical ROI
var dane = [];
function ElipticalRoiTool() {
    if (actionImage == 0) {
        actionImage = 1;
        document.getElementById("wwwl").innerHTML = 'Turn on';
    }
    var element = $('#dicomImage').get(0);
    cornerstoneTools.addTool(EllipticalModifiedTool);
    cornerstoneTools.setToolActive('EllipticalModified', { mouseButtonMask: 1 });

    element.addEventListener('cornerstonetoolsmouseup', function (event) { //cornerstonetoolsmeasurementcompleted
        dane = cornerstoneTools.getToolState(element, 'EllipticalModified');
        console.log(cornerstoneTools.getToolState(element, 'EllipticalModified'));
    });

    var imageStack = {
        currentImageIdIndex: 0,
        imageIds: instances[0],
    };
    cornerstoneTools.addStackStateManager(element, ['stack', 'EllipticalModified']);
    cornerstoneTools.addToolState(element, 'stack', imageStack);
}

// funkcja do rysowania freehand ROI - wywolywana po nacisnieciu przycisku Freehand ROI
var daneF = [];
function FreehandRoiTool() {
    if (actionImage == 0) {
        actionImage = 1;
        document.getElementById("wwwl").innerHTML = 'Turn on';
    }
    $('#deleteFROI').show();
    var element = $('#dicomImage').get(0);
    cornerstoneTools.addTool(FreehandModifiedTool);
    cornerstoneTools.setToolActive('FreehandModified', { mouseButtonMask: 1 });

    element.addEventListener('cornerstonetoolsmouseup', function (event) { //cornerstonetoolsmeasurementcompleted
        console.log(cornerstoneTools.getToolState(element, 'FreehandModified'));
        daneF = cornerstoneTools.getToolState(element, 'FreehandModified');
    });

    var imageStack = {
        currentImageIdIndex: 0,
        imageIds: instances[0],
    };
    cornerstoneTools.addStackStateManager(element, ['stack', 'FreehandModified']);
    cornerstoneTools.addToolState(element, 'stack', imageStack);
}

//funkcja do usuwania zaznaczenia freehand ROI
function DeleteFROI() {
    var element = $('#dicomImage').get(0);
    cornerstoneTools.clearToolState(element, 'FreehandModified');
    daneF = [];
    cornerstone.updateImage(element);
    $('#deleteFROI').hide();
}

// funkcja do uzyskiwania obrazu originalnego po zastosowaniu palety koloru
function restoreImage() {
    var element = $('#dicomImage').get(0);
    var image = cornerstone.getEnabledElement(element).image;

    if (image.restore && (typeof image.restore === 'function')) {
        image.restore();
        $('#color0').text(" ");
        $('#color255').text("");
        $('#colorbar').hide();
        SetFullWindowing();

        cornerstoneTools.toolColors.setToolColor('rgb(255,140,0)');
        cornerstoneTools.toolColors.setActiveColor('greenyellow');
        return true;
    }

    if (image.color == false) {
        cornerstoneTools.toolColors.setToolColor('rgb(255,255,255)');
        cornerstoneTools.toolColors.setActiveColor('greenyellow');
    }

    return false;
}

function TextMarkerTool() {

    var TextMarkerTool = cornerstoneTools.TextMarkerTool;
    var configuration = {
        markers: ['1', '2', '3', '4', '5'],
        current: '1',
        ascending: true,
        loop: true,
    }
    cornerstoneTools.addTool(TextMarkerTool, { configuration });
    cornerstoneTools.setToolActive('TextMarker', { mouseButtonMask: 1 });
}

// krzywe dynamiczne, funkcja wylicza parametry ze wszystkich typów ROI i otwiera panel z lewej strony w ktorym nalezy wybraæ konkretny parametr
function DynamicCurves() {
    console.log('w dynamic');

    var Q = [];
    var countRec = 0;
    var countElip = 0;

    if (daneR.length != 0) {
        for (var j = 0; j < daneR.data.length; j++) {
            for (var i = 0; i < NumberOfFrames; i++) {
                Q[i] = calculateStatsRectangle(AllImages[i], daneR.data[j].handles, imagePixelSpacingColumn, imagePixelSpacingRow);
            }
            DynamicROI[j] = Q;
            NameOfROI[j] = 'ROI R' + (j + 1);
            Q = [];
        }
        countRec = daneR.data.length;
    }
    var W = [];
    if (dane.length != 0) {
        for (var j = 0; j < dane.data.length; j++) {
            for (var i = 0; i < NumberOfFrames; i++) {
                W[i] = calculateStatsEllipse(AllImages[i], dane.data[j].handles, imagePixelSpacingColumn, imagePixelSpacingRow);
            }
            DynamicROI[j + countRec] = W;
            NameOfROI[j + countRec] = 'ROI E' + (j + 1);
            W = [];
        }
        countElip = dane.data.length;
    }
    var S = [];
    if (daneF.length != 0) {
        for (var j = 0; j < daneF.data.length; j++) {
            for (var i = 0; i < NumberOfFrames; i++) {
                S[i] = calculateFreehandStatistics(AllImages[i], daneF.data[j].handles.points, imagePixelSpacingColumn, imagePixelSpacingRow);
            }
            DynamicROI[j + countRec + countElip] = S;
            NameOfROI[j + countRec + countElip] = 'ROI F' + (j + 1);
            S = [];
            console.log(DynamicROI);
        }
    }

    $('#dicomImageWrapper').css('width', '70%');
    $('#dynamicCurves').css('width', '30%');
    $('#dynCurves').show();
    $('#closeCurves').show();
    var element = $('#dicomImage').get(0);
    cornerstone.resize(element);

    $('#bottomright1').css('right', '420px');
    $('#bottomright2').css('right', '420px');
    $('#bottomright3').css('right', '420px');
    $('#bottomright4').css('right', '420px');
}

function OffTool() {
    cornerstoneTools.init();
    cornerstoneTools.setToolPassive('ProbeModified', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('Length', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('Angle', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('CobbAngle', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('RectangleModified', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('EllipticalModified', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('FreehandModified', { mouseButtonMask: 1 });
    cornerstoneTools.setToolPassive('TextMarker', { mouseButtonMask: 1 });
}

// rysowanie histogramu obrazu, otwiera sie panel z lewej str
var ifHist = 0;
var myChart = null;
function DrawImageHistogram() {

    if (ifHist == 0) {

        $('#dicomImageWrapper').css('width', '70%');
        $('#hist').css('width', '30%');
        $('#hist_image').show();
        $('#bottomright1').css('right', '420px');
        $('#bottomright2').css('right', '420px');
        $('#bottomright3').css('right', '420px');
        $('#bottomright4').css('right', '420px');

        var element = $('#dicomImage').get(0);
        cornerstone.resize(element);
        var image = cornerstone.getEnabledElement(element).image;
        var firstHist = 0;

        if (image.color == true) {
            var pixelValues = image.origPixelData;
        } else {
            var pixelValues = image.getPixelData();
        }
        var groups = [];

        var minPixel = pixelValues.sort()[0];
        var maxPixel = pixelValues.sort()[pixelValues.length - 1];

        var k = Math.round(5 * Math.log10(pixelValues.length / 2));

        var WidthClass = Math.round((maxPixel - minPixel) / k);
        console.log(maxPixel + ' ' + minPixel + ' ' + k + ' ' + WidthClass);

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

                if (pixelValues[j] < WidthClass * (k + 1) && pixelValues[j] > WidthClass * k) {
                    groups[k]++;
                }

            }

        }

        var ctx = document.getElementById("hist_image").getContext("2d");

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Image histogram',
                    data: groups
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        ticks: {
                            fontSize: 9
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            fontSize: 12
                        }
                    }],
                }
            }

        });


        document.getElementById("Histogram").innerHTML = 'Delete histogram';
        ifHist = 1;
    } else {
        document.getElementById("Histogram").innerHTML = 'Image';
        myChart.destroy();
        $('#dicomImageWrapper').css('width', '100%');
        $('#hist').css('width', '0%');
        var element = $('#dicomImage').get(0);
        cornerstone.resize(element);
        ifHist = 0;
        $('#bottomright1').css('right', '0px');
        $('#bottomright2').css('right', '0px');
        $('#bottomright3').css('right', '0px');
        $('#bottomright4').css('right', '0px');
    }
}


// rysowanie historgramu ROI, maksymalnie 3 wykresy
var myChartROI = null;
var myChartROI2 = null;
var myChartROI3 = null;
function DrawROIHist() {

    var Q = [];
    var W = [];

    var DataToHistogram = [];
    var LabelsToHistogram = [];

    console.log(daneR);
    console.log(dane);
    console.log(daneF);
    var c = 0;
    var d = 0;

    var element = $('#dicomImage').get(0);
    var image = cornerstone.getEnabledElement(element).image;

    pixelSpacing = {
        colPixelSpacing: image.columnPixelSpacing,
        rowPixelSpacing: image.rowPixelSpacing
    };
    try {
        if (daneR.length > 0 || daneR.data.length > 0) {

            for (var i = 0; i < daneR.data.length; i++) {
                daneR.data[i].cachedStats = _calculateStats2(image, element, daneR.data[i].cachedStats.midCoords, daneR.data[i].handles, pixelSpacing);
                for (var a = 0; a < daneR.data[i].cachedStats.dataToHistogram.length; a++) {
                    Q[a] = daneR.data[i].cachedStats.dataToHistogram[a];
                    W[a] = daneR.data[i].cachedStats.labelsToHistogram[a];
                }
                DataToHistogram[i] = Q;
                LabelsToHistogram[i] = W;
                NameOfROIToHistogram[i] = 'ROI R' + (i + 1);
                Q = [];
                W = [];
            }
            c = daneR.data.length;
        }
    } catch (e) { console.log('error during calculating histogram occured. 1');}

    try {
        if (dane.length > 0 || dane.data.length > 0) {

            for (var i = 0; i < dane.data.length; i++) {
                for (var a = 0; a < dane.data[i].cachedStats.dataToHistogram.length; a++) {
                    dane.data[i].cachedStats = _calculateStats(image, element, dane.data[i].cachedStats.midCoords, dane.data[i].handles, pixelSpacing);
                    Q[a] = dane.data[i].cachedStats.dataToHistogram[a];
                    W[a] = dane.data[i].cachedStats.labelsToHistogram[a];
                }
                DataToHistogram[i + c] = Q;
                LabelsToHistogram[i + c] = W;
                NameOfROIToHistogram[i + c] = 'ROI E' + (i + 1);
                Q = [];
                W = [];
            }
            d = dane.data.length;
        }
    } catch (e) { console.log('error during calculating histogram occured. 2');}

    try {
        if (daneF.length > 0 || daneF.data.length > 0) {

            var pixelDataImage = [];
            if (image.color == true) {
                pixelDataImage = image.origPixelData;
            }
            else {
                pixelDataImage = image.getPixelData();
            }

            for (var i = 0; i < daneF.data.length; i++) {
                for (var a = 0; a < daneF.data[i].meanStdDev.dataToHistogram.length; a++) {
                    var pixels = getOrigPixelsOfImages(
                        pixelDataImage,
                        daneF.data[i].polyBoundingBox.left,
                        daneF.data[i].polyBoundingBox.top,
                        daneF.data[i].polyBoundingBox.width,
                        daneF.data[i].polyBoundingBox.height
                    );
                    daneF.data[i].meanStdDev = _calculateFreehandStatistics(pixels, daneF.data[i].polyBoundingBox, daneF.data[i].handles.points);
                    Q[a] = daneF.data[i].meanStdDev.dataToHistogram[a];
                    W[a] = daneF.data[i].meanStdDev.labelsToHistogram[a];
                }
                DataToHistogram[i + c + d] = Q;
                LabelsToHistogram[i + c + d] = W;
                NameOfROIToHistogram[i + c + d] = 'ROI F' + (i + 1);
                Q = [];
                W = [];
            }
        }
    } catch (e) { console.log('error during calculating histogram occured. 3');}

    if (myChartROI) {
        myChartROI.destroy();
    }
    if (myChartROI2) {
        myChartROI2.destroy();
    }
    if (myChartROI3) {
        myChartROI3.destroy();
    }

    if (DataToHistogram.length == 0) {
        alert('You have to draw ROI first');
    } else {

        if (DataToHistogram.length == 1) {
            $('#dicomImageWrapper').css('width', '70%');
            $('#histROI').css('width', '30%');
            $('#hist_roi1').show();
            $('#hist_roi2').hide();
            $('#hist_roi3').hide();
            $('#closeHistROI').show();
            var element = $('#dicomImage').get(0);
            cornerstone.resize(element);
            $('#bottomright1').css('right', '420px');
            $('#bottomright2').css('right', '420px');
            $('#bottomright3').css('right', '420px');
            $('#bottomright4').css('right', '420px');

            var ctx = document.getElementById('hist_roi1').getContext("2d");

            myChartROI = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: LabelsToHistogram[0],
                    datasets: [{
                        label: NameOfROIToHistogram[0],
                        data: DataToHistogram[0]
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            }
                        }],
                    }
                }
            });
        }
        else if (DataToHistogram.length == 2) {
            $('#dicomImageWrapper').css('width', '70%');
            $('#histROI').css('width', '30%');
            var element = $('#dicomImage').get(0);
            cornerstone.resize(element);
            $('#hist_roi1').show();
            $('#hist_roi2').show();
            $('#hist_roi3').hide();
            $('#closeHistROI').show();
            $('#bottomright1').css('right', '420px');
            $('#bottomright2').css('right', '420px');
            $('#bottomright3').css('right', '420px');
            $('#bottomright4').css('right', '420px');
            var ctx = document.getElementById('hist_roi1').getContext("2d");

            myChartROI = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: LabelsToHistogram[0],
                    datasets: [{
                        label: NameOfROIToHistogram[0],
                        data: DataToHistogram[0]
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            }
                        }],
                    }
                }
            });


            var ctx2 = document.getElementById('hist_roi2').getContext("2d");

            myChartROI2 = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: LabelsToHistogram[1],
                    datasets: [{
                        label: NameOfROIToHistogram[1],
                        data: DataToHistogram[1]
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            }
                        }],
                    }
                }
            });

        }
        else if (DataToHistogram.length == 3) {
            $('#dicomImageWrapper').css('width', '70%');
            $('#histROI').css('width', '30%');
            var element = $('#dicomImage').get(0);
            cornerstone.resize(element);
            $('#hist_roi1').show();
            $('#hist_roi2').show();
            $('#hist_roi3').show();
            $('#closeHistROI').show();
            $('#bottomright1').css('right', '420px');
            $('#bottomright2').css('right', '420px');
            $('#bottomright3').css('right', '420px');
            $('#bottomright4').css('right', '420px');

            var ctx = document.getElementById('hist_roi1').getContext("2d");
            myChartROI = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: LabelsToHistogram[0],
                    datasets: [{
                        label: NameOfROIToHistogram[0],
                        data: DataToHistogram[0]
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            }
                        }],
                    }
                }
            });


            var ctx2 = document.getElementById('hist_roi2').getContext("2d");

            myChartROI2 = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: LabelsToHistogram[1],
                    datasets: [{
                        label: NameOfROIToHistogram[1],
                        data: DataToHistogram[1]
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            }
                        }],
                    }
                }
            });

            var ctx3 = document.getElementById('hist_roi3').getContext("2d");


            myChartROI3 = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: LabelsToHistogram[2],
                    datasets: [{
                        label: NameOfROIToHistogram[2],
                        data: DataToHistogram[2]
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            }
                        }],
                    }
                }
            });
        }

    }
}

$('#closeHistROI').click(function () {
    $('#dicomImageWrapper').css('width', '100%');
    $('#histROI').css('width', '0%');
    var element = $('#dicomImage').get(0);
    cornerstone.resize(element);
    $('#hist_roi1').hide();
    $('#hist_roi2').hide();
    $('#hist_roi3').hide();
    $('#closeHistROI').hide();
    $('#bottomright1').css('right', '0px');
    $('#bottomright2').css('right', '0px');
    $('#bottomright3').css('right', '0px');
    $('#bottomright4').css('right', '0px');
});


(function (cornerstone) {
    'use strict';

    function PrintRange(pixels) {
        var a = Infinity;
        var b = -Infinity;

        for (var i = 0, length = pixels.length; i < length; i++) {
            if (pixels[i] < a)
                a = pixels[i];
            if (pixels[i] > b)
                b = pixels[i];
        }
        console.log(a + ' ' + b);
    }

    function ChangeDynamics(pixels, source1, target1, source2, target2) {
        var scale = (target2 - target1) / (source2 - source1);
        var offset = (target1) - scale * source1;

        for (var i = 0, length = pixels.length; i < length; i++) {
            pixels[i] = scale * pixels[i] + offset;
        }
    }

    function getPixelDataDeflate(image) {
        // Decompresses the base64 buffer that was compressed with Deflate
        var s = pako.inflate(window.atob(image.Orthanc.PixelData));
        var pixels = null;

        if (image.color) {
            var buf = new ArrayBuffer(s.length / 3 * 4); // RGB32
            pixels = new Uint8Array(buf);
            var index = 0;
            for (var i = 0, length = s.length; i < length; i += 3) {
                pixels[index++] = s[i];
                pixels[index++] = s[i + 1];
                pixels[index++] = s[i + 2];
                pixels[index++] = 255;  // Alpha channel
            }
        } else {
            var buf = new ArrayBuffer(s.length * 2); // uint16_t or int16_t

            if (image.Orthanc.IsSigned) {
                pixels = new Int16Array(buf);
            } else {
                pixels = new Uint16Array(buf);
            }

            var index = 0;
            for (var i = 0, length = s.length; i < length; i += 2) {
                var lower = s[i];
                var upper = s[i + 1];
                pixels[index] = lower + upper * 256;
                index++;
            }
        }
        return pixels;
    }

    // http://stackoverflow.com/a/11058858/881731
    function str2ab(str) {
        var buf = new ArrayBuffer(str.length);
        var pixels = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            pixels[i] = str.charCodeAt(i);
        }
        return pixels;
    }
    /*
      // http://stackoverflow.com/a/11058858/881731
        function str2ab(str) {
            var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
            var pixels = new Uint16Array(buf);
            var index = 0;
            for (var i=0, strLen=str.length; i<strLen; i+=2) {
                var lower = str.charCodeAt(i);
                var upper = str.charCodeAt(i+1);
                pixels[index] = lower + (upper <<8);
                index++;
            }
            return pixels;
        }
    */
    function getPixelDataJpeg(image) {
        var jpegReader = new JpegImage();
        var jpeg = str2ab(window.atob(image.Orthanc.PixelData));
        jpegReader.parse(jpeg);
        var s = jpegReader.getData(image.width, image.height);
        var pixels = null;

        if (image.color) {
            var buf = new ArrayBuffer(s.length / 3 * 4); // RGB32
            pixels = new Uint8Array(buf);
            var index = 0;
            for (var i = 0, length = s.length; i < length; i += 3) {
                pixels[index++] = s[i];
                pixels[index++] = s[i + 1];
                pixels[index++] = s[i + 2];
                pixels[index++] = 255;  // Alpha channel
            }
        } else {
            var buf = new ArrayBuffer(s.length * 2); // uint16_t or int16_t

            if (image.Orthanc.IsSigned) {
                pixels = new Int16Array(buf);
            } else {
                pixels = new Uint16Array(buf);
            }

            var index = 0;
            for (var i = 0, length = s.length; i < length; i++) {
                pixels[index] = s[i];
                index++;
            }

            if (image.Orthanc.Stretched) {
                ChangeDynamics(pixels, 0, image.Orthanc.StretchLow, 255, image.Orthanc.StretchHigh);
            }
        }
        return pixels;
    }

    //funkcja do pobierania obrazu
    function getOrthancImage(imageId) {
        var result = null;

        $.ajax({
            type: 'GET',
            url: '../instances/' + compression + '-' + imageId,
            dataType: 'json',
            cache: true,
            async: false,
            success: function (image) {

                image.imageId = imageId;

                if (isFirst) {
                    if (image.Orthanc.PhotometricInterpretation == "MONOCHROME1") {
                        image.invert = true;
                    } else {
                        image.invert = false;
                    }
                    isFirst = false;
                }

                image.getPixelData = function () {
                    if (image.Orthanc.Compression == 'Deflate')
                        return getPixelDataDeflate(this);

                    if (image.Orthanc.Compression == 'Jpeg')
                        return getPixelDataJpeg(this);

                    // Unknown compression
                    return null;
                }

                result = image;
            },
            error: function () {
                alert('Error: This image is not supported by the Web viewer.(w get Image)');
                return null;
            }
        });

        return {
            promise: new Promise((resolve) => {
                resolve(result);
            }),
            cancelFn: undefined
        };
    }
    // register our imageLoader plugin with cornerstone
    cornerstone.registerImageLoader('', getOrthancImage);

}(cornerstone));

$(document).ready(function () {
    $('#unstable').tooltip();

    var studyID = window.url('?study', window.location.search);
    console.log('Displaying study: ' + studyID);
    // var seriess = [];
    var urll = 'http://localhost:8042/studies/' + studyID;
    urll = urll.replace(/&?_=[0-9]*/, '');

    $.ajax({
        type: 'GET',
        url: urll,
        datatype: 'json',
        cache: false,
        async: false,
        success: function (volume2) {
            if (volume2.Series.length != 0) {
                seriess = volume2.Series;
            }
        },
        failure: function () {
            alert('error1');
        }
    });
    console.log('Found series');
    console.log(seriess);

    //  var instances = [];
    var i = 0;
    for (i = 0; i < seriess.length; i++) {

        $.ajax({
            type: 'GET',
            url: '../series/' + seriess[i],
            dataType: 'json',
            cache: false,
            async: false,
            success: function (volume) {
                if (volume.Slices.length != 0) {
                    instances[i] = volume.Slices;
                }
            },
            failure: function () {
                alert('Error: This image is not supported by the Web viewer');
            }
        });

        if (instances.length == 0) {
            console.log('No image in this series');
            return;
        }
    }

    NumberOFImagesInSeries = instances[0].length;

    var instancesInfo = [];
    var a = 0;
    var urll = null;
    var c = null;
    var cc = 0;
    var cut = 0;
    var wynik = null;
    //pobieranie wartoœci z identyfikatorów elementów danych dicom potrzebnych do krzywych dynamicznych
    for (a = 0; a < instances[current].length; a++) {
        c = instances[current][a];
        cc = c.toString();
        cut = cc.indexOf("_");
        wynik = cc.substring(0, cut);

        urll = 'http://localhost:8042/instances/' + wynik + '/tags?simplify';
        urll = urll.replace(/&?_=[0-9]*/, '');


        $.ajax({
            type: 'GET',
            url: urll,
            dataType: 'json',
            cache: false,
            async: false,
            success: function (volume) {
                instancesInfo[0] = volume.NumberOfFrames;
                instancesInfo[1] = volume.NumberOfPhases;
                instancesInfo[2] = volume.PhaseInformationSequence;
            },
            failure: function () {
                alert('Error: This image is not supported by the Web viewer. (w /instancesInfo/..)');
            }
        });

        if (instances[current].length == 0) {
            console.log('No image in this series');
            return;
        }
    }

    NumberOfFrames = instancesInfo[0];
    var NumberOfPhases = 0;
    NumberOfPhases = instancesInfo[1];
    var NumberOfFramesInPhase = [];
    var ActualFrameDuration = [];

    for (var i = 0; i < NumberOfPhases; i++) {
        ActualFrameDuration[i] = instancesInfo[2][i].ActualFrameDuration / 1000;
        NumberOfFramesInPhase[i] = instancesInfo[2][i].NumberOfFramesInPhase;
    }

    TimeArray[0] = 0;
    var x = 0;

    //timeArray
    for (var n = 0; n < NumberOfPhases; n++) {
        for (var i = 1; i <= NumberOfFramesInPhase[n]; i++) {
            TimeArray[i + x] = parseInt(TimeArray[i - 1 + x]) + parseInt(ActualFrameDuration[n]);
        }
        x = x + parseInt(NumberOfFramesInPhase[n]);
    }

    //framDuration
    var f = 0;
    for (var n = 0; n < NumberOfPhases; n++) {
        for (var i = 0; i <= NumberOfFramesInPhase[n]; i++) {
            FrameDuration[i + f] = parseInt(ActualFrameDuration[n]);
            //TimeArray[i + f + 1] = TimeArray[i + f] + FrameDuration[i + f];
        }
        f = f + parseInt(NumberOfFramesInPhase[n]);
    }
    //TimeArray.shift();
    console.log("TimeArray: " + TimeArray);


    // potrzebne do dostarczenia orientacji do narzedzia dodawania markerów orientacji
    (function metaDataProvider(cornerstone) {
        'use strict';

        function metaDataProvider(type, imageId) {
            var element = $('#dicomImage').get(0);
            var image = cornerstone.getEnabledElement(element).image;
            if (type === 'imagePlaneModule') {
                if (imageId === image.imageId) {
                    return {
                        rows: image.rows,
                        columns: image.columns,
                        rowCosines: [image.imageOrientation1, image.imageOrientation2, image.imageOrientation3],
                        columnCosines: [image.imageOrientation4, image.imageOrientation5, image.imageOrientation6],
                        imagePositionPatient: [image.imagePositionX, image.imagePositionY, image.imagePositionZ],
                        columnPixelSpacing: image.columnPixelSpacing,
                        rowPixelSpacing: image.rowPixelSpacing
                    };
                }
            }
        }
        cornerstone.metaData.addProvider(metaDataProvider);

        console.log('series length: ' + seriess.length);

        if (seriess.length >= 2) {
            function metaDataProvider1(type, imageId) {
                var element1 = $('#dicomImage1').get(0);
                var image1 = cornerstone.getEnabledElement(element1).image;
                if (type === 'imagePlaneModule') {

                    if (imageId === image1.imageId) {
                        return {

                            rows: image1.rows,
                            columns: image1.columns,
                            rowCosines: [image1.imageOrientation1, image1.imageOrientation2, image1.imageOrientation3],
                            columnCosines: [image1.imageOrientation4, image1.imageOrientation5, image1.imageOrientation6],
                            imagePositionPatient: [image1.imagePositionX, image1.imagePositionY, image1.imagePositionZ],
                            columnPixelSpacing: image1.columnPixelSpacing,
                            rowPixelSpacing: image1.rowPixelSpacing
                        };
                    }
                }
            }

            function metaDataProvider2(type, imageId) {
                var element2 = $('#dicomImage2').get(0);
                var image2 = cornerstone.getEnabledElement(element2).image;
                if (type === 'imagePlaneModule') {
                    if (imageId === image2.imageId) {
                        return {
                            rows: image2.rows,
                            columns: image2.columns,
                            rowCosines: [image2.imageOrientation1, image2.imageOrientation2, image2.imageOrientation3],
                            columnCosines: [image2.imageOrientation4, image2.imageOrientation5, image2.imageOrientation6],
                            imagePositionPatient: [image2.imagePositionX, image2.imagePositionY, image2.imagePositionZ],
                            columnPixelSpacing: image2.columnPixelSpacing,
                            rowPixelSpacing: image2.rowPixelSpacing
                        };
                    }
                }
            }
            cornerstone.metaData.addProvider(metaDataProvider1);
            cornerstone.metaData.addProvider(metaDataProvider2);
        }
        console.log('adding metadata providers');

    })(cornerstone);

    // ³adowanie obrazów do menu bocznego - funkcja ³adowania
    function updateTheSmallImage(seriesIndexS, imageIndexS, element, viewport) {
        return cornerstone.loadAndCacheImage(instances[seriesIndexS][imageIndexS]).then(function (image) {
            viewport = cornerstone.getViewport(element);
            cornerstone.displayImage(element, image, viewport);
            cornerstoneTools.removeToolState(element, 'Probe');
            cornerstoneTools.removeToolState(element, 'Length');
            cornerstoneTools.removeToolState(element, 'Angle');
            cornerstoneTools.removeToolState(element, 'CobbAngle');
            cornerstoneTools.removeToolState(element, 'RectangleModified');
            cornerstoneTools.removeToolState(element, 'EllipticalModified');
            cornerstoneTools.removeToolState(element, 'FreehandModified');
            cornerstoneTools.removeToolState(element, 'TextMarker');
        });
    }

    /////// £adowanie obrazów do menu bocznego!///////////
    var element11 = $('#smallImage1').get(0);
    cornerstone.enable(element11);
    var viewport11 = cornerstone.getViewport(element11);
    updateTheSmallImage(0, 0, element11, viewport11);

    if (seriess.length >= 2) {
        var element12 = $('#smallImage2').get(0);
        cornerstone.enable(element12);
        var viewport12 = cornerstone.getViewport(element12);
        updateTheSmallImage(1, 0, element12, viewport12);
    }

    if (seriess.length >= 3) {
        var element13 = $('#smallImage3').get(0);
        cornerstone.enable(element13);
        var viewport13 = cornerstone.getViewport(element13);
        updateTheSmallImage(2, 0, element13, viewport13);
    }

    if (seriess.length >= 4) {
        var element14 = $('#smallImage4').get(0);
        cornerstone.enable(element14);
        var viewport14 = cornerstone.getViewport(element14);
        updateTheSmallImage(3, 0, element14, viewport14);
    }

    if (seriess.length >= 5) {
        var element15 = $('#smallImage5').get(0);
        cornerstone.enable(element15);
        var viewport15 = cornerstone.getViewport(element15);
        updateTheSmallImage(4, 0, element15, viewport15);
    }

    ////////////////////
    // do krzywych dynamicznych
    function loadAllImagesInSeries(seriesIndex, imageIndex) {
        return cornerstone.loadAndCacheImage(instances[seriesIndex][imageIndex]).then(function (image) {
            AllImages[imageIndex] = image.getPixelData();
            imageMAX[imageIndex] = image.maxPixelValue;
            imageMIN[imageIndex] = image.minPixelValue;
        });
    }

    for (var i = 0; i < instances[current].length; i++) {
        loadAllImagesInSeries(0, i);
    }


    var DataToChart = [];

    //akcja zmiany radiobutton'ów do krzywych dynamicznych
    $('input[type=radio][name="Radio1"]').change(function () {

        //sprawdzenie czy istniej¹ jakiekolwiek zaznaczone ROI
        if (DynamicROI.length == 0) {
            alert('You have to draw at least one ROI first!');
        } else {

            //czyszczenie wykresu - potrzebne aby nie pokazywa³y siê poprzednie dane
            if (myChart) {
                myChart.destroy();
            }

            var VectorToChart = [];

            //liczenie krzywej dla ka¿dego regionu
            for (var regno = 0; regno < DynamicROI.length; regno++) {

                var dataY = [];
                dataY[0] = 0;

                //potrzebne aby zaczac wykres od poczatku ukladu wspolrzednych, punkt(0,0)
                VectorToChart[0] = {
                    x: 0,
                    y: 0
                }

                for (var i = 1; i < DynamicROI[regno].length; i++) {

                    if (this.value == "sum") {
                        dataY[i] = DynamicROI[regno][i].sum / DynamicROI[regno][i].area / FrameDuration[i];
                    }
                    else if (this.value == "mean") {
                        dataY[i] = DynamicROI[regno][i].mean / DynamicROI[regno][i].area / FrameDuration[i];
                    }
                    else if (this.value == "max") {
                        dataY[i] = DynamicROI[regno][i].max / DynamicROI[regno][i].area / FrameDuration[i];
                    }
                    else if (this.value == "min") {
                        dataY[i] = DynamicROI[regno][i].min / DynamicROI[regno][i].area / FrameDuration[i];
                    }
                    else if (this.value == "stdDev") {
                        dataY[i] = DynamicROI[regno][i].stdDev / DynamicROI[regno][i].area / FrameDuration[i];
                    }
                    VectorToChart[i + 1] = {
                        x: TimeArray[i + 1],
                        y: dataY[i]
                    }
                }

                DataToChart[regno] = VectorToChart;
                VectorToChart = [];
                dataY = [];
            }

            console.log(DataToChart);

            var datasets = [];
            var colortable = ['blue', 'red', 'green', 'yellow', 'darkorange', 'darkorchid', 'gray', 'lightcoral'];

            //przygotowanie datasetu dla ka¿dego regionu
            for (var regno = 0; regno < DynamicROI.length; regno++) {
                datasets[regno] = {
                    label: NameOfROI[regno],
                    data: DataToChart[regno],
                    showLine: true,
                    fill: false,
                    borderColor: colortable[regno % colortable.length],
                    borderWidth: 1,
                    pointBackgroundColor: colortable[regno % colortable.length],
                    pointBorderColor: colortable[regno % colortable.length],
                    pointRadius: 0.1,
                    pointHoverRadius: 0.1
                };
            }
            $('#dynCurves').show();
            var ctx = document.getElementById("dynCurves").getContext("2d");

            myChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    labels: TimeArray,
                    datasets: datasets
                },
                options: {
                    scales: {
                        xAxes: [{
                            ticks: {
                                fontSize: 9,
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Time [s]'
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                fontSize: 12
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Counts/s*cm^2'
                            }
                        }],
                    }
                }
            });
        }
    });


    $('#closeCurves').click(function () {
        $('#dicomImageWrapper').css('width', '100%');
        $('#dynamicCurves').css('width', '0%');
        var element = $('#dicomImage').get(0);
        cornerstone.resize(element);
        $('#dynCurves').hide();
        $('#closeCurves').hide();
        $('#bottomright1').css('right', '0px');
        $('#bottomright2').css('right', '0px');
        $('#bottomright3').css('right', '0px');
        $('#bottomright4').css('right', '0px');
    });

    $('#closeKidneyCurves').click(function () {
        $('#dicomImageWrapper').css('width', '100%');
        $('#kidneyCurves').css('width', '0%');
        var element = $('#dicomImage').get(0);
        cornerstone.resize(element);
        $('#dynKidneyCurves').hide();
        $('#closeKidneyCurves').hide();
        $('#bottomright1').css('right', '0px');
        $('#bottomright2').css('right', '0px');
        $('#bottomright3').css('right', '0px');
        $('#bottomright4').css('right', '0px');
        document.getElementById("Study").innerHTML = 'Kidney Study';
    });
  
 
    // updates the image display
    function updateTheImage(seriesIndex, imageIndex) {
        return cornerstone.loadAndCacheImage(instances[seriesIndex][imageIndex]).then(function (image) {
            currentImageIndex = imageIndex;

            var colormapId = $("select.colormaps", toolbar).val();

            if (colormapId != '') {
                var viewport = cornerstone.getViewport(element);

                cornerstone.displayImage(element, image, viewport);
                colormapChanged(colormapId);
            }

            cornerstone.displayImage(element, image);

            var enabledElement = cornerstone.getEnabledElement(element);
            enabledElement.viewport = cornerstone.getDefaultViewport(enabledElement.canvas, enabledElement.image);

            // poni¿ej dodawanie istniej¹cych ROI na kolejne obrazy 
            var dane_elipse = [];
            dane_elipse = cornerstoneTools.getToolState(element, 'EllipticalModified');

            try {
                for (var i = 0; i <= dane_elipse.data.length; i++) {
                    //przeliczenie nowych wartoœci paramterów
                    dane_elipse.data[i].cachedStats = _calculateStats(image, element, dane_elipse.data[i].cachedStats.midCoords, dane_elipse.data[i].handles, pixelSpacing);
                    //dodanie nowego stanu, nowych wartoœci na ROI
                    cornerstoneTools.addToolState(element, 'EllipticalModified', dane_elipse.data[i]);
                    //usuniêcie starych wartoœci pochodzacych z pierwotnego obrazu
                    cornerstoneTools.removeToolState(element, 'EllipticalModified', dane.data[i]);
                }
            } catch (e) { }

            var dane_rectangle = [];
            dane_rectangle = cornerstoneTools.getToolState(element, 'RectangleModified');

            try {
                for (var i = 0; i <= dane_rectangle.data.length; i++) {
                     //przeliczenie nowych wartoœci paramterów
                    dane_rectangle.data[i].cachedStats = _calculateStats2(image, element, dane_rectangle.data[i].cachedStats.midCoords, dane_rectangle.data[i].handles, pixelSpacing);
                    //dodanie nowego stanu, nowych wartoœci na ROI
                    cornerstoneTools.addToolState(element, 'RectangleModified', dane_rectangle.data[i]);
                    //usuniêcie starych wartoœci pochodzacych z pierwotnego obrazu
                    cornerstoneTools.removeToolState(element, 'RectangleModified', daneR.data[i]);
                }
            } catch (e) { }

            //dla freehand
            var dane_freehand = [];
            dane_freehand = cornerstoneTools.getToolState(element, 'FreehandModified');
            //utworzenie tablicy pikseli zaznaczenia ROI na nowym obrazie
            try {

                var pixelDataImage = [];
                if (image.color == true) {
                    pixelDataImage = image.origPixelData;
                }
                else {
                    pixelDataImage = image.getPixelData();
                }

                for (var i = 0; i <= dane_freehand.data.length; i++) {

                    var pixels = getOrigPixelsOfImages(
                        pixelDataImage,
                        dane_freehand.data[i].polyBoundingBox.left,
                        dane_freehand.data[i].polyBoundingBox.top,
                        dane_freehand.data[i].polyBoundingBox.width,
                        dane_freehand.data[i].polyBoundingBox.height
                    );
                    //przeliczenie nowych wartoœci paramterów
                    dane_freehand.data[i].meanStdDev = _calculateFreehandStatistics(pixels, dane_freehand.data[i].polyBoundingBox, dane_freehand.data[i].handles.points);
                    //dodanie nowego stanu, nowych wartoœci na ROI
                    cornerstoneTools.addToolState(element, 'FreehandModified', dane_freehand.data[i]);
                    //usuniêcie starych wartoœci pochodzacych z pierwotnego obrazu
                    cornerstoneTools.removeToolState(element, 'FreehandModified', daneF.data[i]);
                }

            } catch (e) { }

            cornerstone.updateImage(element);

            imagePixelSpacingColumn = image.columnPixelSpacing;
            imagePixelSpacingRow = image.rowPixelSpacing;
            ///
            pixelSpacing = {
                colPixelSpacing: imagePixelSpacingColumn,
                rowPixelSpacing: imagePixelSpacingRow
            };


            imageColumns = image.columns;
            i = 0;
            $.ajax({
                type: 'GET',
                url: '../series/' + seriess[current],
                dataType: 'json',
                cache: false,
                async: false,
                success: function (volume) {
                    if (volume.Slices.length != 0) {

                        $('#topleft').html(
                            volume.PatientID + '<br/>' +
                            volume.PatientName + '<br/>' +
                            volume.StudyDescription + '<br/>' +
                            volume.SeriesDescription + '<br/>');

                        $('#topright').html(
                            volume.StudyDate + '</br>' +
                            volume.Manufacturer + '</br>' +
                            volume.StationName + '</br>' +
                            volume.InstitutionName + '</br>' +
                            volume.ManufacturerModelName + '</br>');

                        $('#bottomleft').html(volume.Modality + '<br/' +
                            volume.BodyPartExamined + '<br>' +
                            volume.PatientPosition + '<br><br><br>');
                        modalityMainImage = volume.Modality;
                        $('#bottomleftIndex').html('Image: ' + currentImageIndex + ' / ' + instances[current].length);
                        if (volume.PatientHeight) { patientHeight = volume.PatientHeight; }
                        if (volume.PatientWeight) { patientWeight = volume.PatientWeight; }


                    }
                },
                failure: function () {
                    alert('Error: This image is not supported by the Web viewer. 0');
                }
            });

        });
    }

    /////////////////////// panel z 1 g³ównym obrazem/////////////////////////////
    var element = $('#dicomImage').get(0);
    cornerstone.enable(element);

    // load and display the image
    var imagePromise = updateTheImage(current, 0);

    // add handlers for mouse events once the image is loaded.
    imagePromise.then(function () {
        var viewport = cornerstone.getViewport(element);
        UpdateViewportInformation();
        imageOrg = cornerstone.getEnabledElement(element).image;
        imageOrigPixels = imageOrg.getPixelData();
        //dodanie markerów orientacji
        var OrientationMarkersTool = cornerstoneTools.OrientationMarkersTool;
        cornerstoneTools.addTool(OrientationMarkersTool);
        cornerstoneTools.setToolActiveForElement(element, 'OrientationMarkers', {});


        // add event handlers to pan image on mouse move
        $('#dicomImage').mousedown(function (e) {
            var lastX = e.pageX;
            var lastY = e.pageY;
            var mouseButton = e.which;
            if (actionImage == 0) {
                $(document).mousemove(function (e) {
                    var deltaX = e.pageX - lastX,
                        deltaY = e.pageY - lastY;
                    lastX = e.pageX;
                    lastY = e.pageY;

                    if (mouseButton == 1) {
                        var viewport = cornerstone.getViewport(element);
                        viewport.voi.windowWidth += (deltaX / viewport.scale);
                        viewport.voi.windowCenter += (deltaY / viewport.scale);
                        cornerstone.setViewport(element, viewport);
                        UpdateViewportInformation();
                    }

                    else if (mouseButton == 2) {
                        var viewport = cornerstone.getViewport(element);
                        viewport.translation.x += (deltaX / viewport.scale);
                        viewport.translation.y += (deltaY / viewport.scale);
                        cornerstone.setViewport(element, viewport);
                    }
                    else if (mouseButton == 3) {
                        var viewport = cornerstone.getViewport(element);
                        viewport.scale += (deltaY / 100);
                        cornerstone.setViewport(element, viewport);
                        UpdateViewportInformation();
                    }
                });

                $(document).mouseup(function (e) {
                    $(document).unbind('mousemove');
                    $(document).unbind('mouseup');
                });

            }

        });

        $('#dicomImage').on('mousewheel DOMMouseScroll', function (e) {
            // Firefox e.originalEvent.detail > 0 scroll back, < 0 scroll forward
            // chrome/safari e.originalEvent.wheelDelta < 0 scroll back, > 0 scroll forward
            if (e.originalEvent.wheelDelta < 0 || e.originalEvent.detail > 0) {
                currentImageIndex++;
                if (currentImageIndex >= instances[current].length) {
                    currentImageIndex = instances[current].length - 1;
                }
            } else {
                currentImageIndex--;
                if (currentImageIndex < 0) {
                    currentImageIndex = 0;
                }
            }
            updateTheImage(current, currentImageIndex);
            $('#slider').slider("option", "value", currentImageIndex);
            UpdateViewportInformation();
            //prevent page fom scrolling
            return false;
        });
    });


    $('#slider').slider({
        min: 0,
        max: instances[current].length - 1,
        slide: function (event, ui) {
            updateTheImage(current, ui.value);
            UpdateViewportInformation();
        }
    });


    ////////////panel z 2 obrazami - pierwszy od lewej /////////////
    var currentImageIndex1 = 0;
    //// updates the image display
    function updateTheImage1(seriesIndex1, imageIndex1) {
        return cornerstone.loadAndCacheImage(instances[seriesIndex1][imageIndex1]).then(function (image) {
            currentImageIndex1 = imageIndex1;
            cornerstone.displayImage(element1, image);
            var enabledElement = cornerstone.getEnabledElement(element1);
            enabledElement.viewport = cornerstone.getDefaultViewport(enabledElement.canvas, enabledElement.image);
            cornerstone.fitToWindow(element1);
            cornerstone.updateImage(element1);
            cornerstone.fitToWindow(element1);

            $.ajax({
                type: 'GET',
                url: '../series/' + seriess[current1],
                dataType: 'json',
                cache: false,
                async: false,
                success: function (volume) {
                    if (volume.Slices.length != 0) {
                        $('#topleft1').html(volume.PatientID + '<br/>' +
                            volume.PatientName + '<br/>' +
                            volume.StudyDescription + '<br/>' +
                            volume.SeriesDescription + '<br/>');

                        $('#topright1').html(
                            volume.Manufacturer + '</br>' +
                            volume.StationName + '</br>' +
                            volume.InstitutionName + '</br>' +
                            volume.ManufacturerModelName + '</br>');

                        $('#bottomleft1').html(volume.Modality + '<br/>' +
                            volume.BodyPartExamined + '<br>' +
                            volume.PatientPosition + '<br><br><br>');
                        //  + volume.Radiopharmaceutical + '</br>');
                    }
                },
                failure: function () {
                    alert('Error: This image is not supported by the Web viewer.');
                }
            });

        });

    }


    var currentImageIndex2 = 0;

    function updateTheImage2(seriesIndex2, imageIndex2) {
        return cornerstone.loadAndCacheImage(instances[seriesIndex2][imageIndex2]).then(function (image) {
            currentImageIndex2 = imageIndex2;
            cornerstone.displayImage(element2, image);
            var enabledElement = cornerstone.getEnabledElement(element2);
            enabledElement.viewport = cornerstone.getDefaultViewport(enabledElement.canvas, enabledElement.image);
            cornerstone.fitToWindow(element2);
            cornerstone.updateImage(element2);
            cornerstone.fitToWindow(element2);


            $.ajax({
                type: 'GET',
                url: '../series/' + seriess[current2],
                dataType: 'json',
                cache: false,
                async: false,
                success: function (volume) {
                    if (volume.Slices.length != 0) {

                        $('#topleft2').html(volume.PatientID + '<br/>' +
                            volume.PatientName + '<br/>' +
                            volume.StudyDescription + '<br/>' +
                            volume.SeriesDescription + '<br/>');

                        $('#topright2').html(
                            volume.Manufacturer + '</br>' +
                            volume.StationName + '</br>' +
                            volume.InstitutionName + '</br>' +
                            volume.ManufacturerModelName + '</br>');

                        $('#bottomleft2').html(volume.Modality + '<br/>' +
                            volume.BodyPartExamined + '<br>' +
                            volume.PatientPosition + '<br><br><br>');
                        //+ volume.radiopharmaceutical + '</br>');
                    }
                },
                failure: function () {
                    alert('Error: This image is not supported by the Web viewer.');
                }
            });
        });

    }


    if (seriess.length >= 2) {
        var element1 = $('#dicomImage1').get(0);
        cornerstone.enable(element1);
        var imagePromise1 = updateTheImage1(current1, 0);

        //// add handlers for mouse events once the image is loaded.
        imagePromise1.then(function () {
            var viewport1 = cornerstone.getViewport(element1);

            var OrientationMarkersTool1 = cornerstoneTools.OrientationMarkersTool;
            cornerstoneTools.addTool(OrientationMarkersTool1);
            cornerstoneTools.setToolActiveForElement(element1, 'OrientationMarkers', {});

            // add event handlers to pan image on mouse move
            $('#dicomImage1').mousedown(function (e) {
                var lastX = e.pageX;
                var lastY = e.pageY;
                var mouseButton = e.which;
                if (actionImage2 == 0) {
                    $(document).mousemove(function (e) {
                        var deltaX = e.pageX - lastX,
                            deltaY = e.pageY - lastY;
                        lastX = e.pageX;
                        lastY = e.pageY;

                        if (mouseButton == 1) {
                            var viewport1 = cornerstone.getViewport(element1);
                            viewport1.voi.windowWidth += (deltaX / viewport1.scale);
                            viewport1.voi.windowCenter += (deltaY / viewport1.scale);
                            cornerstone.setViewport(element1, viewport1);
                            UpdateViewportInformation1();
                        }

                        else if (mouseButton == 2) {
                            var viewport1 = cornerstone.getViewport(element1);
                            viewport1.translation.x += (deltaX / viewport1.scale);
                            viewport1.translation.y += (deltaY / viewport1.scale);
                            cornerstone.setViewport(element1, viewport1);
                        }
                        else if (mouseButton == 3) {
                            var viewport1 = cornerstone.getViewport(element1);
                            viewport1.scale += (deltaY / 100);
                            cornerstone.setViewport(element1, viewport1);
                            UpdateViewportInformation1();
                        }
                    });

                    $(document).mouseup(function (e) {
                        $(document).unbind('mousemove');
                        $(document).unbind('mouseup');
                    });
                }
            });


            $('#dicomImage1').on('mousewheel DOMMouseScroll', function (e) {
                // Firefox e.originalEvent.detail > 0 scroll back, < 0 scroll forward
                // chrome/safari e.originalEvent.wheelDelta < 0 scroll back, > 0 scroll forward
                if (e.originalEvent.wheelDelta < 0 || e.originalEvent.detail > 0) {
                    currentImageIndex1++;
                    if (currentImageIndex1 >= instances[current1].length) {
                        currentImageIndex1 = instances[current1].length - 1;
                    }
                } else {
                    currentImageIndex1--;
                    if (currentImageIndex1 < 0) {
                        currentImageIndex1 = 0;
                    }
                }


                updateTheImage1(current1, currentImageIndex1);
                $('#slider1').slider("option", "value", currentImageIndex1);
                UpdateViewportInformation1();
                //prevent page fom scrolling
                return false;
            });

        });



        $('#slider1').slider({
            min: 0,
            max: instances[current1].length - 1,
            slide: function (event, ui) {
                updateTheImage1(current1, ui.value);
            }
        });


        //////////////// panel z 2 obrazami -  drugi ///////////////////

        var element2 = $('#dicomImage2').get(0);
        cornerstone.enable(element2);

        var imagePromise2 = updateTheImage2(current2, 0);

        imagePromise2.then(function () {
            var viewport2 = cornerstone.getViewport(element2);

            var OrientationMarkersTool2 = cornerstoneTools.OrientationMarkersTool;
            cornerstoneTools.addTool(OrientationMarkersTool2);
            cornerstoneTools.setToolActiveForElement(element2, 'OrientationMarkers', {});


            // add event handlers to pan image on mouse move
            $('#dicomImage2').mousedown(function (e) {
                var lastX = e.pageX;
                var lastY = e.pageY;
                var mouseButton = e.which;
                if (actionImage2 == 0) {
                    $(document).mousemove(function (e) {
                        var deltaX = e.pageX - lastX,
                            deltaY = e.pageY - lastY;
                        lastX = e.pageX;
                        lastY = e.pageY;

                        if (mouseButton == 1) {
                            var viewport2 = cornerstone.getViewport(element2);
                            viewport2.voi.windowWidth += (deltaX / viewport2.scale);
                            viewport2.voi.windowCenter += (deltaY / viewport2.scale);
                            cornerstone.setViewport(element2, viewport2);
                            UpdateViewportInformation2();
                        }

                        else if (mouseButton == 2) {
                            var viewport2 = cornerstone.getViewport(element2);
                            viewport2.translation.x += (deltaX / viewport2.scale);
                            viewport2.translation.y += (deltaY / viewport2.scale);
                            cornerstone.setViewport(element2, viewport2);
                        }
                        else if (mouseButton == 3) {
                            var viewport2 = cornerstone.getViewport(element2);
                            viewport2.scale += (deltaY / 100);
                            cornerstone.setViewport(element2, viewport2);
                            UpdateViewportInformation2();
                        }
                    });

                    $(document).mouseup(function (e) {
                        $(document).unbind('mousemove');
                        $(document).unbind('mouseup');
                    });
                }

            });


            $('#dicomImage2').on('mousewheel DOMMouseScroll', function (e) {
                // Firefox e.originalEvent.detail > 0 scroll back, < 0 scroll forward
                // chrome/safari e.originalEvent.wheelDelta < 0 scroll back, > 0 scroll forward
                if (e.originalEvent.wheelDelta < 0 || e.originalEvent.detail > 0) {
                    currentImageIndex2++;
                    if (currentImageIndex2 >= instances[current2].length) {
                        currentImageIndex2 = instances[current2].length - 1;
                    }
                } else {
                    currentImageIndex2--;
                    if (currentImageIndex2 < 0) {
                        currentImageIndex2 = 0;
                    }
                }

                updateTheImage2(current2, currentImageIndex2);
                $('#slider2').slider("option", "value", currentImageIndex2);
                UpdateViewportInformation2();
                console.log('slider2: ' + currentImageIndex2);
                //prevent page fom scrolling
                return false;
            });


        });


        $('#slider2').slider({
            min: 0,
            max: instances[current2].length - 1,
            slide: function (event, ui) {
                updateTheImage2(current2, ui.value);
            }
        });
    }

    $('#slider1').hide();
    $('#slider2').hide();


    $("select.display").change(function () {
        display = $(this).children("option:selected").val();

        if (display == 1) { // zmiana na dwa viewporty
            $('#two').css('width', '0%');
            $('#tree').css('width', '0%');
            $('#one').css('width', '100%');

            cornerstone.enable(element);

            $('#bottomright1_1').text('');
            $('#bottomright2_1').text('');
            $('#bottomright3_1').text('');
            $('#bottomright4_1').text('');

            $('#bottomright1_2').text('');
            $('#bottomright2_2').text('');
            $('#bottomright3_2').text('');
            $('#bottomright4_2').text('');

            $('#slider').show();
            $('#slider1').hide();
            $('#slider2').hide();

            $('#topleft').show();
            $('#topleft1').hide();
            $('#topleft2').hide();

            $('#bottomleft').show();
            $('#bottomleft1').hide();
            $('#bottomleft2').hide();

            $('#topright').show();
            $('#topright1').hide();
            $('#topright2').hide();
            $('#bottomleftIndex').show();

            toolbar.show();
            toolbar2.css('top', '420px');
            toolbar3.hide();

            cornerstoneTools.clearToolState(element, 'Probe');
            cornerstoneTools.clearToolState(element, 'Length');
            cornerstoneTools.clearToolState(element, 'Angle');
            cornerstoneTools.clearToolState(element, 'CobbAngle');
            cornerstoneTools.clearToolState(element, 'RectangleModified');
            cornerstoneTools.clearToolState(element, 'EllipticalModified');
            cornerstoneTools.clearToolState(element, 'FreehandModified');
            cornerstoneTools.clearToolState(element, 'TextMarker');

            $('.toolbar-histogram').show();
            toolbar2.css('height', '340px');
            $('#labelHist').show();
            toolbar2.css('top', '350px');
            $('#buttonDynCurves').show();
        }
        if (display == 2) { // zmiana na 1 panel
            if (seriess.length < 2) {
                alert('In this study is only one series!');
                return;
            }

            $('#two').css('width', '100%');
            $('#tree').css('width', '0%');
            $('#one').css('width', '0%');

            cornerstone.enable(element1);
            cornerstone.enable(element2);

            $('#bottomright1').text('');
            $('#bottomright2').text('');
            $('#bottomright3').text('');
            $('#bottomright4').text('');
            $('#colorbar').hide();
            $('#color0').text("");
            $('#color255').text("");

            $('#slider').hide();
            $('#slider1').show();
            $('#slider2').show();

            $('#topleft').hide();
            $('#topleft1').show();
            $('#topleft2').show();

            $('#topright').hide();
            $('#topright1').show();
            $('#topright2').show();

            $('#bottomleft').hide();
            $('#bottomleft1').show();
            $('#bottomleft2').show();

            $('#bottomleftIndex').hide();

            toolbar.hide();
            toolbar2.css('top', '10px');
            toolbar3.show();


            cornerstoneTools.clearToolState(element, 'Probe');
            cornerstoneTools.clearToolState(element, 'Length');
            cornerstoneTools.clearToolState(element, 'Angle');
            cornerstoneTools.clearToolState(element, 'CobbAngle');
            cornerstoneTools.clearToolState(element, 'RectangleModified');
            cornerstoneTools.clearToolState(element, 'EllipticalModified');
            cornerstoneTools.clearToolState(element, 'FreehandModified');
            cornerstoneTools.clearToolState(element, 'TextMarker');

            $('.toolbar-histogram').hide();
            toolbar2.css('height', '240px');
            $('#labelHist').hide();
            $('#buttonDynCurves').hide();
            $('#dynamicCurves').hide();
            $('#kidneyCurves').hide();

        }
    });


    ////////////////////drag and drop//////////////////////

    $('#smallImage1').draggable({
        helper: function () {
            return $(this).clone();
        },
        opacity: 0.5
    });

    $('#smallImage2').draggable({
        helper: function () {
            return $(this).clone();
        },
        opacity: 0.5
    });

    $('#smallImage3').draggable({
        helper: function () {
            return $(this).clone();
        },
        opacity: 0.5
    });

    $('#smallImage4').draggable({
        helper: function () {
            return $(this).clone();
        },
        opacity: 0.5
    });

    $('#smallImage5').draggable({
        helper: function () {
            return $(this).clone();
        },
        opacity: 0.5
    });

    $('#dicomImage').droppable({
        drop: function (event, ui) {
            var id = $(ui.draggable).attr('id');
            var ChoosedId = id;
            cornerstone.reset(element);
            cornerstone.enable(element);

            if (ChoosedId == 'smallImage1') {
                current = 0;
                updateTheImage(0, 0);
            }
            if (ChoosedId == 'smallImage2') {
                current = 1;
                updateTheImage(1, 0);
            }
            if (ChoosedId == 'smallImage3') {
                current = 2;
                updateTheImage(2, 0);
            }
            if (ChoosedId == 'smallImage4') {
                current = 3;
                updateTheImage(3, 0);
            }
            if (ChoosedId == 'smallImage5') {
                current = 4;
                updateTheImage(4, 0);
            }
        }
    });

    $('#dicomImage1').droppable({
        drop: function (event, ui) {
            var id = $(ui.draggable).attr('id');
            var ChoosedId = id;
            cornerstone.reset(element1);
            cornerstone.enable(element1);           

            if (ChoosedId == 'smallImage1') {
                current1 = 0;
                updateTheImage1(0, 0);
            }
            if (ChoosedId == 'smallImage2') {
                current1 = 1;
                updateTheImage1(1, 0);
            }
            if (ChoosedId == 'smallImage3') {
                current1 = 2;
                updateTheImage1(2, 0);
            }
            if (ChoosedId == 'smallImage4') {
                current1 = 3;
                updateTheImage1(3, 0);
            }
            if (ChoosedId == 'smallImage5') {
                current1 = 4;
                updateTheImage1(4, 0);
            }
        }
    });

    $('#dicomImage2').droppable({
        drop: function (event, ui) {
            var id = $(ui.draggable).attr('id');
            var ChoosedId = id;          

            cornerstone.reset(element2);
            cornerstone.enable(element2);

            if (ChoosedId == 'smallImage1') {
                current2 = 0;
                updateTheImage2(0, 0);
            }
            if (ChoosedId == 'smallImage2') {
                current2 = 1;
                updateTheImage2(1, 0);
            }
            if (ChoosedId == 'smallImage3') {
                current2 = 2;
                updateTheImage2(2, 0);
            }
            if (ChoosedId == 'smallImage4') {
                current2 = 3;
                updateTheImage2(3, 0);
            }
            if (ChoosedId == 'smallImage5') {
                current2 = 4;
                updateTheImage2(4, 0);
            }
        }
    });

    //panele z przyciskami

    var toolbar = $.jsPanel({
        selector: "#buttons",
        position: { top: 10, left: 110 },
        size: { width: 150, height: 285 },
        content: $('#toolbar-content').show(),
        //controls: { buttons: 'none' },
        title: 'Basic'
    });

    var toolbar2 = $.jsPanel({
        selector: "#buttons",
        position: { top: 340, left: 110 },
        size: { width: 150, height: 310 },
        content: $('#toolbar-tools').show(),
        //controls: { buttons: 'none' },
        title: 'Tools'
    });

    var toolbar3 = $.jsPanel({
        selector: "#buttons",
        position: { top: 280, left: 110 },
        size: { width: 150, height: 60 },
        content: $('#toolbar-sync').show(),
        //controls: { buttons: 'none' },
        title: 'Other tools'
    });

    // obs³uga przycisków //

    $('.toolbar-view', toolbar).buttonset().children()
        .first().button().click(ToggleInversion)
        .next().button().click(ToggleInterpolation)
        .next().button().click(Rotation)
        .next().button().click(ZoomIn)
        .next().button().click(ZoomOut)
        //.next().button().click(function1)
        .next().button().click(calculateKidney)


    $('.toolbar-windowing', toolbar).buttonset().children()
        .first().button().click(SetDefaultWindowing)
        .next().button().click(SetFullWindowing)
        .next().button().click(TurnOffChanging)


    $('.restoreImage', toolbar).buttonset().children()
        .first().button().click(restoreImage);

    $('.toolbar-tool', toolbar2).buttonset().children()
        .first().button().click(ProbeTool)
        .next().button().click(LengthTool)
        .next().button().click(AngleTool)
        .next().button().click(ElipticalRoiTool)
        .next().button().click(RectangleRoiTool)
        .next().button().click(FreehandRoiTool)
        .next().button().click(TextMarkerTool)
        .next().button().click(OffTool)
        .next().button().click(DynamicCurves)
        .next().button().click(DeleteFROI)

    $('.toolbar-histogram', toolbar2).buttonset().children()
        .first().button().click(DrawImageHistogram)
        .next().button().click(DrawROIHist)


    toolbar3.hide();
    $('.toolbar-sync', toolbar3).buttonset().children()
        .first().button().click(ReferenceTools)
        .next().button().click(TurnOffChanging2)

    // Dropdown listener to get the new colormap
    // selected by the user and update the image

    function updateColorbar(colormap) {
        var lookupTable = colormap.createLookupTable();
        $('#colorbar').show();
        var canvas = $('#colorbar').get(0);
        var ctx = canvas.getContext('2d');
        var height = canvas.height;
        var width = canvas.width;
        var colorbar = ctx.createImageData(30, 200);

        // Set the min and max values then the lookup table
        // will be able to return the right color for this range
        lookupTable.setTableRange(0, height);
        //aby odwróciæ zakres kolorów i uci¹æ 3 pierwsze kolory
        lookupTable.Table.reverse();
        lookupTable.Table.shift();
        lookupTable.Table.shift();
        lookupTable.Table.shift();
        // Update the colorbar pixel by pixel

        for (var row = 0; row < height; row++) {
            var color = lookupTable.mapValue(row);         
            for (var col = 0; col < width; col++) {
                var pixel = (col + row * width) * 4;
                colorbar.data[pixel] = color[0];
                colorbar.data[pixel + 1] = color[1];
                colorbar.data[pixel + 2] = color[2];
                colorbar.data[pixel + 3] = color[3];
            }
        }


        ctx.putImageData(colorbar, 0, 0);
    }

    // funkcja zmiany palety koloru
    function colormapChanged(colormapId) {

        var image = cornerstone.getEnabledElement(element).image;
        restoreImage();

        var colormap;
        colormap = getColormap(colormapId);

        SetWindowing(128, 255);
        cornerstone.convertToFalseColorImage(element, colormap);

        updateColorbar(colormap);
        $('#color0').text(" 0 ");
        $('#color255').text("255");
        UpdateViewportInformation();

        if (image.color == true) {
            cornerstoneTools.toolColors.setActiveColor('greenyellow');
            cornerstoneTools.toolColors.setToolColor('rgb(255, 255, 255)');
        }
    }

    $("select.colormaps", toolbar).change(function () {
        var colormapId = $(this).children("option:selected").val();

        colormapChanged(colormapId);

    });
    console.log(instances);



    function SetCompression(c) {
        compression = c;
        cornerstone.imageCache.purgeCache();
        updateTheImage(currentImageIndex);
        cornerstone.invalidateImageId(instances[currentImageIndex]);
    }


    ResizeCornerstone();
    $(window).resize(function (e) {
        if (!$(e.target).hasClass('jsPanel'))  // Ignore toolbar resizing
        {
            ResizeCornerstone();
        }
    });


    var reflines = 0;

    ///linia referencyjna//
    function ReferenceTools() {


        var synchronizer = new cornerstoneTools.Synchronizer(
            // Cornerstone event that should trigger synchronizer
            'cornerstonenewimage',
            // Logic that should run on target elements when event is observed on source elements
            cornerstoneTools.updateImageSynchronizer
        )

        if (display == 2 && reflines == 0) {
            var element1 = $('#dicomImage1').get(0);
            var element2 = $('#dicomImage2').get(0);

            cornerstone.enable(element1);
            cornerstone.enable(element2);

            // Create our Stack data
            var firstSeries = instances[current1];
            var secondSeries = instances[current2];

            var firstStack = {
                currentImageIdIndex: 0,
                imageIds: firstSeries,
            };


            var secondStack = {
                currentImageIdIndex: 0,
                imageIds: secondSeries,
            };

            cornerstoneTools.addTool(cornerstoneTools.StackScrollTool);
            cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);
            cornerstoneTools.setToolActive('StackScroll', { mouseButtonMask: 1 });
            cornerstoneTools.setToolActive('StackScrollMouseWheel', {});


            // load images and set the stack
            var firstLoadImagePromise = cornerstone.loadImage(firstStack.imageIds[0])
                .then((image) => {
                    cornerstone.displayImage(element1, image);

                    // set the stack as tool state
                    synchronizer.add(element1);
                    cornerstoneTools.addStackStateManager(element1, ['stack', 'Crosshairs']);
                    cornerstoneTools.addToolState(element1, 'stack', firstStack);
                })

            var secondLoadImagePromise = cornerstone.loadImage(secondStack.imageIds[0])
                .then((image) => {
                    cornerstone.displayImage(element2, image);

                    // set the stack as tool state
                    synchronizer.add(element2);
                    cornerstoneTools.addStackStateManager(element2, ['stack', 'Crosshairs']);
                    cornerstoneTools.addToolState(element2, 'stack', secondStack);
                })

            // After images have loaded, and our sync context has added both elements
            Promise.all([firstLoadImagePromise, secondLoadImagePromise])
                .then(() => {
                    cornerstoneTools.addTool(cornerstoneTools.ReferenceLinesTool);
                    cornerstoneTools.setToolEnabled('ReferenceLines', {
                        synchronizationContext: synchronizer,
                    });
                });

            var numImagesLoaded = 0;

            function addReferenceLinesTool() {

                // These have to be added to our synchronizer before we pass it to our tool
                synchronizer.add(element1);
                synchronizer.add(element2);

                cornerstoneTools.addTool(cornerstoneTools.ReferenceLinesTool);
                cornerstoneTools.setToolEnabled('ReferenceLines', {
                    synchronizationContext: synchronizer,
                });
            }

            var handleImageRendered = (evt) => {
                evt.detail.element.removeEventListener('cornerstoneimagerendered', handleImageRendered)

                numImagesLoaded++;
                if (numImagesLoaded === 2) {
                    addReferenceLinesTool();
                }
            }
            element1.addEventListener('cornerstoneimagerendered', handleImageRendered);
            element2.addEventListener('cornerstoneimagerendered', handleImageRendered);
            reflines = 1;
            document.getElementById("referencelines").innerHTML = 'Delete reference lines';
        }


        else {
            cornerstoneTools.setToolPassive('ReferenceLines', {
                synchronizationContext: synchronizer,
            });
            cornerstoneTools.setToolPassive('StackScroll', { mouseButtonMask: 1 });
            cornerstoneTools.setToolPassive('StackScrollMouseWheel', {});
            reflines = 0;
            document.getElementById("referencelines").innerHTML = 'Add reference lines';
        }

    }

});