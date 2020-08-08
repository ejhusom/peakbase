var L = L || require('leaflet');

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", (event) => {
    const fileList = event.target.files;
    console.log(fileList);
});

var map = L.map('map').setView([41.9, 12.5], 12);
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
}).addTo(map);

var colors = ["red", "blue", "green", "yellow", "brown", "black", "white", "purple"];

function extractPeaks(xmlDoc) {

    var peaks = [];
    
    wpt_tag = xmlDoc.getElementsByTagName("wpt")
    ele_tag = xmlDoc.getElementsByTagName("ele")
    name_tag = xmlDoc.getElementsByTagName("name")
    link_tag = xmlDoc.getElementsByTagName("link")
    sym_tag = xmlDoc.getElementsByTagName("sym")

    for (let i = 0; i < xmlDoc.getElementsByTagName("wpt").length; i++) {
    // for (let i = 0; i < 3; i++) {
        
        var peak = new Object();
        peak.ele = parseInt(ele_tag[i].childNodes[0].nodeValue);
        peak.name = name_tag[i].childNodes[0].nodeValue.trim();
        peak.link = link_tag[i].getAttribute("href"); 
        peak.sym = sym_tag[i].childNodes[0].nodeValue.trim();
        peak.lat = wpt_tag[i].getAttribute("lat");
        peak.lon = wpt_tag[i].getAttribute("lon");

        peaks.push(peak);

    };

    console.log(peaks[0]);

    return peaks;
}

function plotPeak(peak) {

    L.marker([peak.lat, peak.lon]).addTo(map)
        .bindPopup(peak.name + ' ' + peak.ele)
        .openPopup();

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

            for (let i = 0; i < peaks.length; i++) {
            // for (let i = 0; i < 3; i++) {
                plotPeak(peaks[i]);
            }

        }
        reader.readAsText(files.item(i));
    }

    // plotMap(pathList);


    // console.log(files.length);
    // for (let i = 0; i < files.length; i++) {
    //     // const element = files.item(i);
    //     reader.readAsText(files.item(i));

}
