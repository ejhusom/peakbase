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

    ele_tag = xmlDoc.getElementsByTagName("ele")
    name_tag = xmlDoc.getElementsByTagName("name")
    link_tag = xmlDoc.getElementsByTagName("link")
    sym_tag = xmlDoc.getElementsByTagName("sym")

    for (let i = 0; i < xmlDoc.getElementsByTagName("wpt").length; i++) {
        
        var peak = new Object();
        peak.ele = parseInt(ele_tag[i].childNodes[0].nodeValue);
        peak.name = name_tag[i].childNodes[0].nodeValue.trim();
        // FIXME: Get link from link tag.
        // peak.link = link_tag[i].getAttributeValue("href"); 
        peak.sym = sym_tag[i].childNodes[0].nodeValue.trim();

        peaks.push(peak);

    };

    console.log(peaks[0]);

    return peaks;
}

function plotPeak(peak) {

    L.marker([51.5, -0.09]).addTo(map)
        .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
        .openPopup();

}


document.getElementById('import').onclick = function () {
    var files = document.getElementById('file-selector').files;
    console.log(files);

    var pathList = [];

    for (let i = 0; i < files.length; i++) {
        var reader = new FileReader();

        // var div = document.createElement("div");
        // div.id = "plot" + i.toString();
        // document.getElementById("dataPlots").appendChild(div);

        reader.onload = function (e) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            var peaks = extractPeaks(xmlDoc);

            // for (let i = 0; i < peaks.length; i++) {
            //     plotPeak(peaks[i
            // }

        }
        reader.readAsText(files.item(i));
    }

    // plotMap(pathList);


    // console.log(files.length);
    // for (let i = 0; i < files.length; i++) {
    //     // const element = files.item(i);
    //     reader.readAsText(files.item(i));

}
