/*
 * TODO: Lage grønn markør der man lager new peak
 * TODO: Nye topper blir mulig å legge til andre
 * TODO: Mulig å lage kommentarer?
 * TODO: Ta vekk default values etter at en topp er fylt inn
 * TODO: "Unregister" peak if you pressed the wrong one
 * TODO: Dialogboks bør komme rett ved der du klikker
 * TODO: Sjekke for duplikater. Fjerne duplikater, eventuelt spar på den som
 * har visited
 */

// var L = L || require('leaflet')
var L = L || require('leaflet') || require("Leaflet.draw")

var peaks_unvisited = [];
var peaks_visited = [];

var unvisitedMarkers;
var visitedMarkers;

let tempMarker;

var markerRadius = 6;
var peaksDrawn = false;

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", (event) => {
    const fileList = event.target.files;
});

var opentopomap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    preferCanvas: true,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

var norgeskart = L.tileLayer('https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', {
    preferCanvas: true,
    attribution: '<a href="http://www.kartverket.no/">Kartverket</a>'
});

var map = L.map('map', {
    drawControl: false,
    center: [65, 14],
    zoom: 5,
    layers: [norgeskart, opentopomap],
});

var baseMaps = {
    "OpenTopoMap (global)": opentopomap,
    "Norgeskart (Norway)": norgeskart,
}

L.control.layers(baseMaps).addTo(map);

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
// var drawControl = new L.Control.Draw({
//     edit: {
//         featureGroup: drawnItems
//     }
// });

const drawControl = new L.Control.Draw({
    draw: {
        marker   : false,
        polygon  : false,
        polyline : false,
        // rectangle: true,
        rectangle: {
            title: "Mark"
        },
        circle   : {
            metric: 'metric',
        },
        toolbar: {
            buttons: {
                rectangle: "Mark multiple peaks as visited",
                circle: "Mark multiple peaks as visited",
            },
        },
    },
    edit: false,
});

map.addControl(drawControl);


var colors = ["red", "blue", "green", "yellow", "brown", "black", "white", "purple"];

L.Rectangle.include({
    contains: function(latLng) {
        return this.getBounds().contains(latLng);
    }
});

L.Circle.include({
    contains: function(latLng) {
        return this.getLatLng().distanceTo(latLng) < this.getRadius();
    }
});

map.on(L.Draw.Event.CREATED, function (e) {
    
    // if (e.layerType === "polyline"){
    //     console.log(e);
    // } else {
    var selectedMarkers = [];
    var markerList = "";
    unvisitedMarkers.eachLayer(function (marker) {
        if (e.layer.contains(marker.getLatLng())) {
            // marker.remove();
            selectedMarkers.push(marker);
            markerList = markerList + marker._tooltip._content + "\n";
        }
        // console.log(selectedMarkers);
        // console.log(markerList);

    });
    var visited = confirm("Mark these peaks as visited?\n" + markerList);

    if (visited === true) {

        for (let i = 0; i < selectedMarkers.length; i++) {
            peak = findPeak(
                selectedMarkers[i]._latlng.lat,
                selectedMarkers[i]._latlng.lng,
                peaks_unvisited
            );
            markPeakAsVisited(peak);
        }

    }
    // // Update plot and count
    drawPeaks(peaks_unvisited, peaks_visited);
    updatePeakCounts();
});



/**
 * Extract information about peaks (or other points of interest) from an
 * uploaded gpx-file.
 * @param {} xmlDoc XML-docuemnt to parse.
 */
function extractPeaks(xmlDoc) {

    var wpts = xmlDoc.getElementsByTagName("wpt");

    console.log("Extracting peaks...");

    for (let i = 0; i < wpts.length; i++) {
        
        var peak = new Object();
        var wpt = wpts[i];

        // Save infor about peak.
        try {
            peak.ele = parseInt(
                wpt.getElementsByTagName("ele")[0].firstChild.nodeValue
            );
        } catch {
            peak.ele = null;
        }
        try {
            peak.name = (
                wpt.getElementsByTagName("name")[0].firstChild.nodeValue.trim()
            );
        } catch {
            peak.name = "Unknown name";
        }
        try {
            peak.link = wpt.getElementsByTagName("link")[0].getAttribute("href");
        } catch {
            peak.link = null;
        }
        try {
            peak.sym = (
                wpt.getElementsByTagName("sym")[0].firstChild.nodeValue.trim()
            );
        } catch {
            peak.sym = null;
        }


        // Try to find the "cmt"-tag for the waypoint, otherwise set attribute
        // to zero.
        try {
            peak.cmt = wpt.getElementsByTagName("cmt")[0].firstChild.nodeValue.trim();
        } catch {
            peak.cmt = "";
        }

        try {
            peak.lat = parseFloat(wpt.getAttribute("lat"));
            peak.lon = parseFloat(wpt.getAttribute("lon"));
            
            // If the "cmt"-tag indicates that the peak has been visited, save it
            // in a separate list.
            if (peak.cmt === "visited") {
                peaks_visited.push(peak);
            } else {
                peaks_unvisited.push(peak);
            }

        } catch {
            console.log("Could not find coordinates of waypoint.");
        }
    };

    console.log("Peaks extracted!");

    return [peaks_unvisited, peaks_visited];
}

function plotPeaks(peaks, className="peaks") {
    
    console.log("Plotting peaks...");

    var visitedColor = "#428bca";
    var unvisitedColor = "#d9534f";

    if (className === "peaks-visited") {
        var markerColor = "#428bca";
    } else {
        var markerColor = "#d9534f";
    }

    // Create marker cluster in order to make the number of markers
    // managable for the browser.
    var markers = L.markerClusterGroup({
        // maxClusterRadius affects how large the clusters will be.
        // Default is 80, decreasing makes smaller clusters.
        maxClusterRadius: 80,
        // This property set the minimum zoom level for where every
        // marker will be displayed, even though they would normally be
        // clustered.
        disableClusteringAtZoom: 10,
        // Disable spiderfyOnMaxZoom when using
        // disableClusteringAtZoom, since the desired behaviour is to
        // zoom to get all points, not only the points under a specific
        // cluster.
        spiderfyOnMaxZoom: false,
        // chunkedLoading splits addLayers processing to avoid page
        // freeze.
        chunkedLoading: true,
        iconCreateFunction: function (cluster) {
            var icon = markers._defaultIconCreateFunction(cluster);
            icon.options.className = className;
            return icon;
        }
    });



    for (let i = 0; i < peaks.length; i++) {
        var peak = peaks[i];

        var marker = L.circleMarker(
            [peak.lat, peak.lon], {
                radius: markerRadius,
                color: markerColor,
            }
        ).bindTooltip(
            peak.name + ', ' + peak.ele + ' masl'
        );

        marker.on("click", function (e) {
            // Check if the peak clicked on is unvisited
            console.log(e.target);
            changeDisplay("newPeakForm", "none");
            
            // If a tempMarker already exists, remove it from the map
            if (tempMarker) {
                map.removeLayer(tempMarker);
            }

            /* Create marker at location of double-click */
            tempMarker = L.marker(
                [e.latlng.lat, e.latlng.lng]
            ).bindTooltip(
                "Selected peak"
            ).addTo(map);

            if (e.target.options.color === unvisitedColor) {
                changeDisplay("newAscentForm", "none");
                changeDisplay("editPeakForm", "block");
                changeDisplay("markPeakAsVisitedButton", "inline");
                changeDisplay("markPeakAsUnvisitedButton", "none");
                var peak = findPeak(e.target._latlng.lat, e.target._latlng.lng, peaks_unvisited);
                updateSelectedPeakInfo(peak);
                // console.log("Updated peak info");
                // var visited = confirm("Mark '" + peak.name + " (" + peak.ele + " masl)' as visited?");
                // // If user confirms that the peak is visited, move it to the
                // // visited peaks list
                // if (visited === true) {
                //     markPeakAsVisited(peak);

                //     // Update plot and count
                //     drawPeaks(peaks_unvisited, peaks_visited);
                //     updatePeakCounts();
                // }
            } else {
                var peak = findPeak(e.target._latlng.lat, e.target._latlng.lng, peaks_visited);
                updateSelectedPeakInfo(peak);
                changeDisplay("newAscentForm", "block");
                changeDisplay("editPeakForm", "block");
                changeDisplay("markPeakAsVisitedButton", "none");
                changeDisplay("markPeakAsUnvisitedButton", "inline");
            }
        });

        markers.addLayer(marker);
        
    }

    map.addLayer(markers);

    console.log("Peaks plotted!");
    return markers;
}

function markPeakAsVisited (peak) {
    peak.cmt = "visited"
    peaks_visited.push(peak);

    var idx = peaks_unvisited.indexOf(peak);
    peaks_unvisited.splice(idx, 1);

}

function markPeakAsVisited2() {
    var lat = parseFloat(document.getElementById("selectedPeakLat").innerHTML);
    var lon = parseFloat(document.getElementById("selectedPeakLon").innerHTML);
    var peak = findPeak(lat, lon, peaks_unvisited);
    var idx = peaks_unvisited.indexOf(peak);

    peak.cmt = "visited"
    peaks_visited.push(peak);

    peaks_unvisited.splice(idx, 1);

    drawPeaks(peaks_unvisited, peaks_visited);
    updatePeakCounts();

    alert("Peak marked as visited!");

    changeDisplay("markPeakAsVisitedButton", "none");
    changeDisplay("markPeakAsUnvisitedButton", "inline");
    changeDisplay("newAscentForm", "block");
}

function markPeakAsUnvisited() {
    var lat = parseFloat(document.getElementById("selectedPeakLat").innerHTML);
    var lon = parseFloat(document.getElementById("selectedPeakLon").innerHTML);
    var peak = findPeak(lat, lon, peaks_visited);
    console.log(peak);
    var idx = peaks_visited.indexOf(peak);

    peak.cmt = ""
    peaks_unvisited.push(peak);

    peaks_visited.splice(idx, 1);

    drawPeaks(peaks_unvisited, peaks_visited);
    updatePeakCounts();

    alert("Peak marked as unvisited!");

    changeDisplay("newAscentForm", "none");
    changeDisplay("editPeakForm", "none");
}

function deletePeak() {
    var lat = parseFloat(document.getElementById("selectedPeakLat").innerHTML);
    var lon = parseFloat(document.getElementById("selectedPeakLon").innerHTML);

    var peak = findPeak(lat, lon, peaks_visited);

    if (peak) {
        var idx = peaks_visited.indexOf(peak);
        peaks_visited.splice(idx, 1);
    } else {
        var peak = findPeak(lat, lon, peaks_unvisited);
        var idx = peaks_unvisited.indexOf(peak);
        peaks_unvisited.splice(idx, 1);
    }
    alert("Peak deleted!");
    drawPeaks(peaks_unvisited, peaks_visited);
    updatePeakCounts();
    emptySelectedPeakInfo();
    changeDisplay("newAscentForm", "none");
    changeDisplay("editPeakForm", "none");
}

function findPeak (lat, lon, peakArray) {
    var peak;
    var decimalPlaces = 4;

    for (let i = 0; i < peakArray.length; i++) {
        if (lat.toFixed(decimalPlaces) === peakArray[i].lat.toFixed(decimalPlaces)) {
            if (lon.toFixed(decimalPlaces) === peakArray[i].lon.toFixed(decimalPlaces)) {
                peak = peakArray[i];
                console.log("Peak found!");
                return peak;
            }
        }
    }
}

function createXMLElement(tag, string) {

    startTag = "<" + tag + ">"
    endTag = "</" + tag + ">\n"

    return startTag + string + endTag;

}

function createPeakWpt(peak) {

    var wpt = "";

    wpt += "<wpt lon='" + peak.lon + "' lat='" + peak.lat + "'>";
    wpt += "\n";

    try {
        wpt += createXMLElement("ele", peak.ele.toString());
    } catch {
        wpt += createXMLElement("ele", "null");
    }

    try {
        wpt += createXMLElement("name", peak.name)
    } catch {
        wpt += createXMLElement("name", "null");
    }

    try {
        wpt += "<link href='" + peak.link + "'/>";
        wpt += "\n";
    } catch {
        wpt += "<link href=''/>";
        wpt += "\n";
    }

    try {
        wpt += createXMLElement("sym", peak.sym)
    } catch {
        wpt += createXMLElement("sym", "Summit");
    }

    try {
        wpt += createXMLElement("cmt", peak.cmt)
    } catch {
        console.log("Comment not found.");
    }

    wpt += "</wpt>\n";

    return wpt;
}

function writePeaksToGPX(peaks) {

    console.log("Writing peaks to gpx-file...");
    peaks_visited.sort(dynamicSort("name"));
    peaks_unvisited.sort(dynamicSort("name"));

    var t = new Date();
    var timestamp = t.getFullYear() + String(t.getMonth()+1).padStart(2, '0') 
        + String(t.getDate()).padStart(2, '0') 
        + "-" 
        + String(t.getHours()).padStart(2, '0') 
        + String(t.getMinutes()).padStart(2, '0');

    var peaks = peaks[0].concat(peaks[1]);
    var gpxText = "<gpx>";
    gpxText += "\n";

    for (let i = 0; i < peaks.length; i++) {
        peakWpt = createPeakWpt(peaks[i]);
        gpxText += peakWpt;
    }

    gpxText += "</gpx>";

    var filename = "peaks-" + timestamp + ".gpx";

    const blob = new Blob([gpxText], {type: "text/plain"});
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    link.remove();


}

function writePeaksToJSON(peaks) {
    console.log("Writing peaks to json-file...");
    peaks_visited.sort(dynamicSort("name"));
    peaks_unvisited.sort(dynamicSort("name"));

    var t = new Date();
    var timestamp = t.getFullYear() + String(t.getMonth()+1).padStart(2, '0') 
        + String(t.getDate()).padStart(2, '0') 
        + "-" 
        + String(t.getHours()).padStart(2, '0') 
        + String(t.getMinutes()).padStart(2, '0');

    var peaks = peaks[0].concat(peaks[1]);

    var filename = "peaks-" + timestamp + ".json";


    var dataStr = JSON.stringify(peaks);
    console.log(dataStr);

    const blob = new Blob([dataStr], {type: "text/plain"});
    var url = window.URL || window.webkitURL;
    link = url.createObjectURL(blob);
    var a = document.createElement("a");
    a.download = filename;
    a.href = link;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

}

function drawPeaks (peaks_unvisited, peaks_visited, reset_zoom=false) {

    // Clears all previous markers before drawing peaks
    if (unvisitedMarkers != undefined) {
        unvisitedMarkers.clearLayers();
        visitedMarkers.clearLayers();
    }

    unvisitedMarkers = plotPeaks(peaks_unvisited);
    visitedMarkers = plotPeaks(peaks_visited, "peaks-visited");

    if (reset_zoom) {
        map.setView([65, 14], 5);
    }

    peaksDrawn = true;

}

function updatePeakCounts () {
    document.getElementById("numVisitedPeaks").innerHTML = "Peaks ascended: " + peaks_visited.length + " (" + peaks_unvisited.length + " left)";
}

// Import existing peakbase
// document.getElementById('import-existing-database').onclick = function () {
document.getElementById('file-selector').addEventListener('change', function(e) {

    startLoading();

    var files = document.getElementById('file-selector').files;
    var importedFileName = files[0].name;
    console.log(importedFileName);
    var re = /(?:\.([^.]+))?$/;
    var ext = re.exec(importedFileName)[1];

    var reader = new FileReader();

    reader.onload = function (e) {

        // Reset arrays in case user clicks "Import" multiple times
        peaks_visited = [];
        peaks_unvisited = [];

        if (ext === "gpx") {

            // Parse gpx file.
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            peaks = extractPeaks(xmlDoc);
            peaks_unvisited = peaks[0];
            peaks_visited = peaks[1];

            updatePeakCounts();
            drawPeaks(peaks_unvisited, peaks_visited, reset_zoom=true);

        } else if (ext === "json") {

            var jsonFile = JSON.parse(e.target.result);

            for (let i=0; i<jsonFile.length; i++) {
                var p = jsonFile[i];
                
                if (p.cmt === "visited") {
                    peaks_visited.push(p);
                } else {
                    peaks_unvisited.push(p);
                }
            }
            updatePeakCounts();
            drawPeaks(peaks_unvisited, peaks_visited, reset_zoom=true);
            stopLoading();
        } else {
            window.alert("File most be .gpx or .json.");
        }
        // // peaks_visited.sort(dynamicSort("name"));
        // // peaks_unvisited.sort(dynamicSort("name"));
        // // peaks_unvisited = checkDuplicates(peaks_unvisited);
        // // peaks_visited = checkDuplicates(peaks_visited);

        // var peaks = peaks_visited.concat(peaks_unvisited);
        // peaks.sort(dynamicSort("name"))
        // peaks = checkDuplicates(peaks);

        // peaks_visited = [];
        // peaks_unvisited = [];

        // for (let i=0; i<peaks.length; i++) {
        //     var p = peaks[i];
            
        //     if (p.cmt === "visited") {
        //         peaks_visited.push(p);
        //     } else {
        //         peaks_unvisited.push(p);
        //     }
        // }
        // updatePeakCounts();
        // drawPeaks(peaks_unvisited, peaks_visited);

    }
    reader.readAsText(files.item(0));

});

document.getElementById("start-new-database").onclick = function () {

    // setTimeout(donothing,3000)

    var startNewDatabase = confirm("Do you want to start from scratch using the default peakbase? This will wipe the current map for registered ascents.");

    if (startNewDatabase === true) {
        startLoading();

        fetch("https://peakbase.app/assets/peaks.json")
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            peaks_visited = [];
            peaks_unvisited = [];

            for (let i=0; i<data.length; i++) {
                var p = data[i];
                peaks_unvisited.push(p);
            }
            updatePeakCounts();
            drawPeaks(peaks_unvisited, peaks_visited, reset_zoom=true);
            stopLoading();
          })
    }
}

function onMapDblClick(e) {
    
    changeDisplay("newAscentForm", "none");
    emptySelectedPeakInfo();

    // If a tempMarker already exists, remove it from the map
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    /* Create marker at location of double-click */
    tempMarker = L.marker(
        [e.latlng.lat, e.latlng.lng], {
            // radius: markerRadius,
            color: "#000000",
        }
    ).bindTooltip(
        "New peak"
    ).addTo(map);

    // Opens pop-up with coordinates. Not needed anymore.
    // L.popup()
    //     .setLatLng(e.latlng)
    //     .setContent("Coordinates: " + e.latlng.toString())
    //     .openOn(map);

    changeDisplay("newPeakForm", "block");

    document.getElementById("newPeakLat").value = e.latlng.lat;
    document.getElementById("newPeakLon").value = e.latlng.lng;

    /* Old way of creating peak */
    // var peak = new Object();
    // peak.lat = e.latlng.lat;
    // peak.lon = e.latlng.lng;
    // peak.sym = "Summit";
    // peak.name = "unknown";
    // peak.ele = "";
    // peak.link = "";
    // peak.cmt = "";

    // peak.name = prompt("Name of peak", "");

    // if (peak.name === null) {
    //     return;
    // }

    // peak.ele = prompt("Elevation of peak", "");

    // if (peak.ele === null) {
    //     return;
    // }

    // var visited = confirm("Visited?");
    // var save = confirm("Save peak?");

    // console.log(peaks_visited.length);
    // if (save === true) {
    //     if (visited == true) {
    //         peak.cmt = "visited";
    //         peaks_visited.push(peak);
    //     } else {
    //         peaks_unvisited.push(peak);
    //     }
    // }
    // console.log(peaks_visited.length);
    
    // console.log(save);
    // console.log("Peak created: " + peak.name);
    // updatePeakCounts();
    // drawPeaks(peaks_unvisited, peaks_visited);

    /* TODO: Getting elevation automatically, does not work yet */
    // var eleUrl = "https://api.open-elevation.com/api/v1/lookup\?locations\=10,10\|20,20\|" 
    //     + peak.lat + "," + peak.lon;
    // var eleUrl = "https://api.open-elevation.com/api/v1/lookup\?locations\=10,10\|20,20\|41.161758,-8.583933"

    // const request = new Request(eleUrl);
    // console.log("Trying to get elevation...");

    // fetch(eleUrl, {
    //     // headers: {
    //     //     "Access-Control-Allow-Origin"
    //     // }
    // })
    // .then(response => response.json())
    // .then(data => console.log(data))
    // .catch(err => {
    //     console.log("Could not fetch elevation.")
    // });


}

function changeDisplay(formId, display) {
    document.getElementById(formId).style.display = display;
}

function updateSelectedPeakInfo(peak) {
    document.getElementById("selectedPeakInfo").innerHTML = peak.name + " (" + peak.ele + " masl)";
    document.getElementById("selectedPeakName").innerHTML = peak.name;
    document.getElementById("selectedPeakEle").innerHTML = peak.ele;
    document.getElementById("selectedPeakLat").innerHTML = peak.lat;
    document.getElementById("selectedPeakLon").innerHTML = peak.lon;

    if (peak.ascents !== undefined) {
        
        /* Old way of showing ascents: */
        // var ascentsString = "<ol>";
        // for (let i=0; i<peak.ascents.length; i++) {
        //     ascentsString += "<li>" + peak.ascents[i] + "</li>";
        // }
        // ascentsString += "</ol>";
        // document.getElementById("selectedPeakAscents").innerHTML = ascentsString;

        var ascentsString = "<details>";
        ascentsString += "<summary>" + peak.ascents.length + " ascents</summary>\n";
        ascentsString += "<ol>";
        for (let i=0; i<peak.ascents.length; i++) {
            ascentsString += "<li>" + peak.ascents[i] + "</li>";
        }
        ascentsString += "</ol>";
        ascentsString += "</details>";
        document.getElementById("selectedPeakAscents").innerHTML = ascentsString;
    } else {
        document.getElementById("selectedPeakAscents").innerHTML = "";
    }
}

function emptySelectedPeakInfo() {
    document.getElementById("selectedPeakInfo").innerHTML = "";
    document.getElementById("selectedPeakName").innerHTML = "";
    document.getElementById("selectedPeakEle").innerHTML = "";
    document.getElementById("selectedPeakLat").innerHTML = "";
    document.getElementById("selectedPeakLon").innerHTML = "";
    document.getElementById("selectedPeakAscents").innerHTML = "";
}

function saveNewPeak() {
    var peak = new Object();
    peak.lat = parseFloat(document.getElementById("newPeakLat").value);
    peak.lon = parseFloat(document.getElementById("newPeakLon").value);
    peak.sym = "Summit";
    peak.name = document.getElementById("newPeakName").value;
    peak.ele = document.getElementById("newPeakEle").value;
    peak.link = "";
    peak.cmt = "";
    console.log("Peak created: " + peak.name);
    peaks_unvisited.push(peak);
    updatePeakCounts();
    drawPeaks(peaks_unvisited, peaks_visited);
    changeDisplay("newPeakForm", "none");
    alert("New peak created successfully!");
}

function saveNewAscent() {

    var lat = parseFloat(document.getElementById("selectedPeakLat").innerHTML);
    var lon = parseFloat(document.getElementById("selectedPeakLon").innerHTML);
    var peak = findPeak(lat, lon, peaks_visited);
    var idx = peaks_visited.indexOf(peak);
    console.log(peaks_visited[idx]);

    peak = peaks_visited[idx];

    // Create array for ascents if it is not already defined
    if (peak.ascents === undefined) {
        peak.ascents = []
    }

    peak.ascents.push(document.getElementById("ascentDate").value);
    peak.ascents.sort();

    console.log(peaks_visited[idx]);

    // changeDisplay("newAscentForm", "none");
    updateSelectedPeakInfo(peak);
    alert("Ascent recorded successfully!");
}

function dynamicSort(property) {

    return function (a,b) {
        return a[property].localeCompare(b[property]);
    }
}

function checkDuplicates(peaks_array) {

    console.log(peaks_array);
    var dupIndeces = [];

    for (let j=0; j < peaks_array.length; j++) {
        console.log(peaks_array[j].name);
        for (let k=j+1; k < peaks_array.length; k++) {
            if (peaks_array[j].lat === peaks_array[k].lat && peaks_array[j].lon === peaks_array[k].lon) {
                dupIndeces.push(k);
                if (peaks_array[k].cmt === "visited") {
                    peaks_array[j].cmt = "visited";
                } else {
                    break;
                }
            }
        }
    }

    for (let i = dupIndeces.length-1; i >= 0; i--) {
        peaks_array.splice(dupIndeces[i], 1);
    }

    return peaks_array;
}

function startLoading() {
    document.getElementById("loading-spinner").style.display = "block";
    document.getElementById("loading-background").style.display = "block";
}

function stopLoading() {
    document.getElementById("loading-spinner").style.display = "none";
    document.getElementById("loading-background").style.display = "none";
}

map.on("dblclick", onMapDblClick);

var field = document.querySelector('#ascentDate');
var date = new Date();

// Set the date
field.value = date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString().padStart(2, 0) + 
    '-' + date.getDate().toString().padStart(2, 0);

// Instruction modal
var modal = document.getElementById("instructionModal");
var span = document.getElementsByClassName("close")[0];
var showInstructionsButton = document.getElementById("showInstructions");

span.onclick = function() {
  modal.style.display = "none";
}

showInstructionsButton.onclick = function() {
  modal.style.display = "block";
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// Show instruction modal
document.addEventListener("DOMContentLoaded", function() {
  modal.style.display = "block";
});

window.onload = function() {
  // Connects the button for "Upload peak database" to the hidden file selector
  document.getElementById('upload-file-button').addEventListener('click', function() {
    document.getElementById('file-selector').click();
  });

}
