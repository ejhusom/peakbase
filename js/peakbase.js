var L = L || require('leaflet');

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", (event) => {
    const fileList = event.target.files;
    console.log(fileList);
});

var map = L.map('map').setView([60.9, 9.5], 7);
L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', {
    minZoom: 6,
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

function extractPeaks(xmlDoc) {

    var peaks = [];
    
    wpt_tag = xmlDoc.getElementsByTagName("wpt")
    ele_tag = xmlDoc.getElementsByTagName("ele")
    name_tag = xmlDoc.getElementsByTagName("name")
    link_tag = xmlDoc.getElementsByTagName("link")
    sym_tag = xmlDoc.getElementsByTagName("sym")

    console.log("Extracting peaks...");

    for (let i = 0; i < xmlDoc.getElementsByTagName("wpt").length; i++) {
    // for (let i = 0; i < 3; i++) {
        
        var peak = new Object();
        peak.ele = parseInt(ele_tag[i].childNodes[0].nodeValue);
        peak.name = name_tag[i].childNodes[0].nodeValue.trim();
        peak.link = link_tag[i].getAttribute("href"); 
        peak.sym = sym_tag[i].childNodes[0].nodeValue.trim();
        peak.lat = parseFloat(wpt_tag[i].getAttribute("lat"));
        peak.lon = parseFloat(wpt_tag[i].getAttribute("lon"));

        peaks.push(peak);

    };

    console.log("Peaks extracted!");

    return peaks;
}

function plotPeak(peak) {

     var marker = L.circleMarker(
    // var myIcon = L.divIcon({className: 'my-div-icon'});
    // L.marker(
        [peak.lat, peak.lon], {
            // icon: myIcon
            radius: 1
        }
    // ).bindTooltip(
    //     peak.name + ' ' + peak.ele
    // ).addTo(map);
    );

    markers.addLayer(marker);

}


document.getElementById('import').onclick = function () {
    var files = document.getElementById('file-selector').files;
    console.log(files);

    var pathList = [];

    for (let i = 0; i < files.length; i++) {
        var reader = new FileReader();

        reader.onload = function (e) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            var peaks = extractPeaks(xmlDoc);

            var centerLat = 60;
            var centerLon = 9;

            var latDiff = 0.1;
            var lonDiff = 1.0;

            console.log("Plotting peaks...");

            var markers = L.markerClusterGroup();

            for (let i = 0; i < peaks.length; i++) {
            // for (let i = 0; i < 3000; i++) {
                // if (peaks[i].lat > centerLat - latDiff
                //         && peaks[i].lat < centerLat + latDiff
                //         && peaks[i].lon > centerLon - lonDiff
                //         && peaks[i].lon < centerLon + lonDiff) 
                // {
                    // plotPeak(peaks[i]);
                // }
                var peak = peaks[i];
                var marker = L.circleMarker(
                // var myIcon = L.divIcon({className: 'my-div-icon'});
                // L.marker(
                    [peak.lat, peak.lon], {
                        // icon: myIcon
                        radius: 1
                    }
                // ).bindTooltip(
                //     peak.name + ' ' + peak.ele
                // ).addTo(map);
                );

                markers.addLayer(marker);
            }

            map.addLayer(markers);

            console.log("Peaks plotted!");

        }
        reader.readAsText(files.item(i));
    }

    // plotMap(pathList);


    // console.log(files.length);
    // for (let i = 0; i < files.length; i++) {
    //     // const element = files.item(i);
    //     reader.readAsText(files.item(i));

}
