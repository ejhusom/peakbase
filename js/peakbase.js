var L = L || require('leaflet');

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", (event) => {
    const fileList = event.target.files;
    console.log(fileList);
});

var map = L.map('map').setView([65, 14], 5);
L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', {
    preferCanvas: true,
    attribution: '<a href="http://www.kartverket.no/">Kartverket</a>'
}).addTo(map);

// var map = L.map('map').setView([60.9, 9.5], 7);
// L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
//     maxZoom: 17,
//     preferCanvas: true,
//     attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
// }).addTo(map);

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
        peak.ele = parseInt(
            wpt.getElementsByTagName("ele")[0].firstChild.nodeValue
        );
        peak.name = (
            wpt.getElementsByTagName("name")[0].firstChild.nodeValue.trim()
        );
        peak.link = wpt.getElementsByTagName("link")[0].getAttribute("href");
        peak.sym = (
            wpt.getElementsByTagName("sym")[0].firstChild.nodeValue.trim()
        );
        peak.lat = parseFloat(wpt.getAttribute("lat"));
        peak.lon = parseFloat(wpt.getAttribute("lon"));

        // Try to find the "cmt"-tag for the waypoint, otherwise set attribute
        // to zero.
        try {
            peak.cmt = wpt.getElementsByTagName("cmt")[0].firstChild.nodeValue.trim();
        } catch {
            peak.cmt = null;
        }

        // If the "cmt"-tag indicates that the peak has been visited, save it
        // in a separate list.
        if (peak.cmt === "visited") {
            peaks_visited.push(peak);
        } else {
            peaks.push(peak);
        }
    };

    console.log("Peaks extracted!");

    return [peaks, peaks_visited];
}

function plotPeaks(peaks, markerColor="#ffffff") {
    
    console.log("Plotting peaks...");

    // Create marker cluster in order to make the number of markers
    // managable for the browser.
    var markers = L.markerClusterGroup({
        // maxClusterRadius affects how large the clusters will be.
        // Default is 80, decreasing makes smaller clusters.
        maxClusterRadius: 80,
        // This property set the minimum zoom level for where every
        // marker will be displayed, even though they would normally be
        // clustered.
        disableClusteringAtZoom: 11,
        // Disable spiderfyOnMaxZoom when using
        // disableClusteringAtZoom, since the desired behaviour is to
        // zoom to get all points, not only the points under a specific
        // cluster.
        spiderfyOnMaxZoom: false,
        // chunkedLoading splits addLayers processing to avoid page
        // freeze.
        chunkedLoading: true
    });

    for (let i = 0; i < peaks.length; i++) {
        var peak = peaks[i];
        var markerRadius = 3;

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
            peak.name + ' ' + peak.ele
        );

        markers.addLayer(marker);
    }

    map.addLayer(markers);

    console.log("Peaks plotted!");
}


document.getElementById('import').onclick = function () {
    var files = document.getElementById('file-selector').files;
    console.log(files);

    var pathList = [];

    for (let i = 0; i < files.length; i++) {
        var reader = new FileReader();

        reader.onload = function (e) {

            // Parse gpx file.
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            var peaks = extractPeaks(xmlDoc);

            console.log(peaks[1]);
            plotPeaks(peaks[0]);
            plotPeaks(peaks[1], "#008000");

        }
        reader.readAsText(files.item(i));
    }

    // plotMap(pathList);


    // console.log(files.length);
    // for (let i = 0; i < files.length; i++) {
    //     // const element = files.item(i);
    //     reader.readAsText(files.item(i));

}
