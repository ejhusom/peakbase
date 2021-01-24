var L = L || require('leaflet');

var peaks_unvisited = [];
var peaks_visited = [];

var unvisitedMarkers;
var visitedMarkers;

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", (event) => {
    const fileList = event.target.files;
    console.log(fileList);
});

// var map = L.map('map').setView([65, 14], 5);
// L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', {
//     preferCanvas: true,
//     attribution: '<a href="http://www.kartverket.no/">Kartverket</a>'
// }).addTo(map);
// var map = L.map('map').setView([60.9, 9.5], 7);
// L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
//     maxZoom: 17,
//     preferCanvas: true,
//     attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
// }).addTo(map);


var opentopomap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    preferCanvas: true,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

var norgeskart = L.tileLayer('https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', {
    preferCanvas: true,
    attribution: '<a href="http://www.kartverket.no/">Kartverket</a>'
});

var map = L.map('map', {
    center: [65, 14],
    zoom: 5,
    layers: [norgeskart, opentopomap]
});

var baseMaps = {
    "OpenTopoMap": opentopomap,
    "Norgeskart": norgeskart,
}

L.control.layers(baseMaps).addTo(map);

var colors = ["red", "blue", "green", "yellow", "brown", "black", "white", "purple"];

/**
 * Extract informatino about peaks (or other points of interest) from an
 * uploaded gpx-file.
 * @param {} xmlDoc XML-docuemnt to parse.
 */
function extractPeaks(xmlDoc) {

    var wpts = xmlDoc.getElementsByTagName("wpt");

    console.log("Extracting peaks...");

    for (let i = 0; i < wpts.length; i++) {
    // for (let i = 0; i < 5; i++) {
        
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
            peak.cmt = null;
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
        var markerRadius = 5;

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
            if (e.target.className != "peaks-visited") {
                var visited = confirm("Visited?");
                // If user confirms that the peak is visited, move it to the
                // visited peaks list
                if (visited === true) {
                    // Find peak
                    var peak;
                    var lat = e.target._latlng.lat;
                    var lon = e.target._latlng.lng;
                    var decimalPlaces = 3;
                    console.log(typeof lat);
                    console.log("Lat: " + lat + ", lon: " + lon);

                    for (let i = 0; i < peaks_unvisited.length; i++) {
                        if (lat.toFixed(decimalPlaces) === peaks_unvisited[i].lat.toFixed(decimalPlaces)) {
                            if (lon.toFixed(decimalPlaces) === peaks_unvisited[i].lon.toFixed(decimalPlaces)) {
                                peak = peaks_unvisited[i];
                                console.log("Peak found!");
                            }
                        }
                    }
                    // Add peak to peaks_visited
                    console.log(peaks_visited.length);
                    console.log("Peak: " + peak.name);
                    peak.cmt = "visited";
                    peaks_visited.push(peak);
                    console.log(peaks_visited.length);
                    // Remove peak for peaks unvisited
                    console.log(peaks_unvisited.length);
                    console.log("Removing " + peak.name);
                    var idx = peaks_unvisited.indexOf(peak);
                    console.log("Idx: " + idx);
                    peaks_unvisited.splice(idx, 1);
                    console.log(peaks_unvisited.length);
                    // Change color of marker
                    // marker.setStyle({color: "#428bca"});
                    // console.log(marker);

                    // markers.removeLayer(marker);
                    // markers.addLayer(marker);
                    // map.removeLayer(markers);
                    // map.addLayer(markers);
                    drawPeaks(peaks_unvisited, peaks_visited);
                    updatePeakCounts();
                    console.log(peaks_unvisited);
                    console.log(peaks_visited);
                }
            }
            // } else {
                // var notVisited = confirm("Not visited?");
                // if (notVisited === true) {
                //     peaks.push(peak);
                // }
            // }
        });

        markers.addLayer(marker);
        
    }

    map.addLayer(markers);

    // TODO: Add loading indicator whilst plotting
    console.log("Peaks plotted!");
    return markers;
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

function drawPeaks (peaks_unvisited, peaks_visited) {

    // if (unvisitedMarkers != undefined) {
    //     unvisitedMarkers.clearLayers();
    //     visitedMarkers.clearLayers();
    // }

    unvisitedMarkers = plotPeaks(peaks_unvisited);
    visitedMarkers = plotPeaks(peaks_visited, "peaks-visited");

    // unvisitedMarkers.on("click", function (e) {
    //     var clickedMarker = e.layer;

    //     // Check if the peak clicked on is unvisited
    //     if (clickedMarker.options.color === "#d9534f") {
    //         var visited = confirm("Visited?");
    //         // If user confirms that the peak is visited, move it to the
    //         // visited peaks list
    //         if (visited === true) {
    //             // Add peak to peaks_visited
    //             console.log(peaks_visited.length);
    //             peaks_visited.push(peak);
    //             console.log(peaks_visited.length);
    //             // Remove peak for peaks unvisited
    //             console.log(peaks_unvisited.length);
    //             console.log("Removing " + peak.name);
    //             var idx = peaks_unvisited.indexOf(peak.name);
    //             peaks_unvisited.splice(idx, 1);
    //             console.log(peaks_unvisited.length);
                // Change color of marker
                // marker.setStyle({color: "#428bca"});
                // console.log(marker);

                // markers.removeLayer(marker);
                // markers.addLayer(marker);
                // map.removeLayer(markers);
                // map.addLayer(markers);
                // drawPeaks(peaks_unvisited, peaks_visited);
            // }
        // }
         // } else {
          // var notVisited = confirm("Not visited?");
          // if (notVisited === true) {
          //     peaks.push(peak);
          // }
         // }
    // });
}



document.getElementById('import').onclick = function () {
    var files = document.getElementById('file-selector').files;
    console.log(files);

    for (let i = 0; i < files.length; i++) {
        var reader = new FileReader();

        reader.onload = function (e) {

            // Parse gpx file.
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            peaks = extractPeaks(xmlDoc);
            peaks_unvisited = peaks[0];
            peaks_visited = peaks[1];

            updatePeakCounts();

            drawPeaks(peaks_unvisited, peaks_visited);


        }
        reader.readAsText(files.item(i));
    }


}

function updatePeakCounts () {
    document.getElementById("numVisitedPeaks").innerHTML = "Number of visited peaks: " + peaks_visited.length;
    document.getElementById("numUnvisitedPeaks").innerHTML = "Number of unvisited peaks: " + peaks_unvisited.length;
}

function onMapDblClick(e) {

    L.popup()
        .setLatLng(e.latlng)
        .setContent("Coordinates: " + e.latlng.toString())
        .openOn(map);

    var peak = new Object();
    peak.lat = e.latlng.lat;
    peak.lon = e.latlng.lng;
    peak.sym = "Summit";
    peak.name = "unknown";
    peak.ele = "0";
    peak.link = "";
    peak.cmt = "";

    peak.name = prompt("Name of peak", "");

    if (peak.name === null) {
        return;
    }

    peak.ele = prompt("Elevation of peak", "");

    if (peak.ele === null) {
        return;
    }

    var visited = confirm("Visited?");
    var save = confirm("Save peak?");

    console.log(peaks_visited.length);
    if (save === true) {
        if (visited == true) {
            peak.cmt = "visited";
            peaks_visited.push(peak);
        } else {
            peaks_unvisited.push(peak);
        }
    }
    console.log(peaks_visited.length);
    
    console.log(save);
    console.log("Peak created: " + peak.name);
    updatePeakCounts();
    drawPeaks(peaks_unvisited, peaks_visited);

    // var eleUrl = "https://api.open-elevation.com/api/v1/lookup\?locations\=10,10\|20,20\|" 
        // + peak.lat + "," + peak.lon;
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



// function onMapDblClick(e) {
//     console.log("Double click registered.");
// }

// map.on("click", onMapClick);
map.on("dblclick", onMapDblClick);
// document.querySelector("#download").addEventListener('click', writePeaksToGPX(peaks));


