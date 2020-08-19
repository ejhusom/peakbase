var L = L || require('leaflet');

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
    "Norgeskart": norgeskart,
    "OpenTopoMap": opentopomap
}

L.control.layers(baseMaps).addTo(map);

var colors = ["red", "blue", "green", "yellow", "brown", "black", "white", "purple"];

/**
 * Extract informatino about peaks (or other points of interest) from an
 * uploaded gpx-file.
 * @param {} xmlDoc XML-docuemnt to parse.
 */
function extractPeaks(xmlDoc) {

    var peaks = [];
    var peaks_visited = [];
    
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
                peaks.push(peak);
            }

        } catch {
            console.log("Could not find coordinates of waypoint.");
        }
    };

    console.log("Peaks extracted!");

    return [peaks, peaks_visited];
}

function plotPeaks(peaks, className="peaks") {
    
    console.log("Plotting peaks...");

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

        // if (peak.cmt === "visited") {
        //     var markerColor = "#FFFFFF";
        //     var markerRadius = 3;
        // }

        var marker = L.circleMarker(
            [peak.lat, peak.lon], {
                radius: markerRadius,
                color: markerColor
            }
        ).bindTooltip(
            peak.name + ', ' + peak.ele + ' masl'
        );

        markers.addLayer(marker);
    }

    map.addLayer(markers);

    console.log("Peaks plotted!");
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

    // try {
    //     wpt += createXMLElement("src", peak.src)
    // } catch {
    //     wpt += createXMLElement("src", "null");
    // }

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

            console.log(peaks[1]);
            plotPeaks(peaks[0]);
            plotPeaks(peaks[1], "peaks-visited");

        }
        reader.readAsText(files.item(i));
    }


}

function onMapClick(e) {
    L.popup()
        .setLatLng(e.latlng)
        .setContent("Coordinates: " + e.latlng.toString())
        .openOn(map);

    var peak = new Object();
    peak.lat = e.latlng.lat;
    peak.lon = e.latlng.lon;
    peak.sym = "Summit";
    peak.name = "unknown";
    peak.ele = "0";
    peak.link = "";
    peak.cmt = "";

    var eleUrl = "https://api.open-elevation.com/api/v1/lookup\?locations\=10,10\|20,20\|" 
        + peak.lat + "," + peak.lon;
    // var eleUrl = "https://api.open-elevation.com/api/v1/lookup\?locations\=10,10\|20,20\|41.161758,-8.583933"

    // const request = new Request(eleUrl);
    console.log("Trying to get elevation...");

    fetch(eleUrl, {
        // headers: {
        //     "Access-Control-Allow-Origin"
        // }
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(err => {
        console.log("Could not fetch elevation.")
    });


}

map.on("click", onMapClick);
// document.querySelector("#download").addEventListener('click', writePeaksToGPX(peaks));

