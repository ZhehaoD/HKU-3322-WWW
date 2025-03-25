let userLat
let userLng

function geoFindMe() {
    var output = document.getElementById("out");
    if (!navigator.geolocation) {
        output.innerHTML = "<p>Geolocation is not supported by your browser</p>";
        return;
    }
    function success(position) {
        userLat=position.coords.latitude,
        userLng=position.coords.longitude
        findNearbyStops(userLat, userLng);

    }
    function error() {
        output.innerHTML = "Unable to retrieve your location";
    }
    navigator.geolocation.getCurrentPosition(success, error);
}

function fetchKmbStopData() {
    const storedData = sessionStorage.getItem('kmbStopData');
    if (storedData) {
        return Promise.resolve(JSON.parse(storedData));
    }
    return fetch('https://data.etabus.gov.hk/v1/transport/kmb/stop')
      .then(response => {
            if (response.status != 200) {
                console.log("HTTP return status: " + response.status);
            }
            return response.json();
        })
      .then(data => {
            sessionStorage.setItem('kmbStopData', JSON.stringify(data));
            return data;
        })
      .catch(error => {
            console.error('Fetch Error', error);
            return null;
        });
}

function ETA(stopid){
    return fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopid}`)
      .then(response => {
            if (response.status != 200) {
                console.log("HTTP return status: " + response.status);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Fetch Error', error);
            return null;
        });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function findNearbyStops(lat, lon) {
    const print = document.getElementById("stopsout");
    const radius = parseInt(document.getElementById("distance").value, 10);
    const stopData = await fetchKmbStopData();

    if (!stopData) {
        print.innerHTML = '<span id="F3">Failed to fetch bus stop data</span>';
        return;
    }

    const stops = stopData.data;
    const nearbyStops = [];

    for (const stop of stops) {
        const stopLat = parseFloat(stop.lat);
        const stopLon = parseFloat(stop.long);
        const distance = Math.trunc(calculateDistance(lat, lon, stopLat, stopLon));

        if (distance !== null && distance <= radius) {
            nearbyStops.push({ ...stop, distance });
        }
    }

    nearbyStops.sort((a, b) => a.distance - b.distance);

    let output = '';
    if (nearbyStops.length === 0) {
        output = '<span id="Cannot">Cannot locate nearby bus stops</span>';
    } else {
        nearbyStops.forEach(stop => {
            output += HTML(stop, stop.distance);
        });
    }

    print.innerHTML = output;

    nearbyStops.forEach(stop => {
        updateETA(stop.stop);
        renderMiniMap(stop, lat, lon);
    });
}


function HTML(stop, distance) {
    const mapId = `map-${stop.stop}`;
    const waiteta = `eta-${stop.stop}`;

    return `
        <details>
            <summary class="stop-info">
                <span id="F3"><strong>D</strong>istance: ${distance}m</span>
                <strong>S</strong>top: <span id="F4"> ${stop.name_en}</span>
            </summary>
            <div id="${waiteta}" class="eta-results"></div>
            <div id="${mapId}" class="mini-map"></div>
        </details>
    `;
}

async function updateETA(stopId) {
    const waiteta = document.getElementById(`eta-${stopId}`);
    const ETAS = await ETA(stopId);
    let output = '';
    const routes = [];
    const names = [];
    const ETATimes = [];

    ETAS.data.forEach((eta, i) => {
        const date = new Date(eta.eta);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const time = hours >= 12 ? 'PM' : 'AM';

        if (hours > 12){
            hours -= 12;
        }

        if (minutes < 10) {
            minutes = `0${minutes}`;
        } 

        if (eta.service_type === 1) {
            routes[i] = eta.route;
            names[i] = eta.dest_en;
            ETATimes[i] = `${hours}:${minutes} ${time}`;
        }
    });

    output += `<div id="total"><div><div id="route">${routes[0]}</div><div id="names">${names[0]}</div><br><div id="ETAWord">ETA:</div><div id="ETATime">${ETATimes[0]}</div>`;

    for (let j = 1; j < ETATimes.length; j++) {
        if (routes[j] && names[j] && ETATimes[j]) {
            if (routes[j] === routes[j - 1] && names[j] === names[j - 1] && ETATimes[j] === ETATimes[j - 1]) {
                continue;
            } else if (routes[j] === routes[j - 1] && names[j] === names[j - 1]) {
                output += `<div id="ETATime">${ETATimes[j]}</div>`;
            } else {
                output += `<br><div id="route">${routes[j]}</div><div id="names">${names[j]}</div><br><div id="ETAWord">ETA:</div><div id="ETATime">${ETATimes[j]}</div>`;
            }
        }
    }

    output += "</div></div>";
    waiteta.innerHTML = output || "No bus route information";
}


function renderMiniMap(stop, userLat, userLon) {
    const radiusSelect = document.getElementById("distance").value;
    var change=0;
    const mapId = `map-${stop.stop}`;
    const stopLat = parseFloat(stop.lat);
    const stopLon = parseFloat(stop.long);
    const centerLon = (userLon + stopLon) / 2;
    const centerLat = (userLat + stopLat) / 2;
    if(radiusSelect<=200){
        change=18;
    }else if (radiusSelect==300){
        change=17;
    }
    else{
        change=16;
    }
    const map = new ol.Map({
        target: mapId,
        layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
        view: new ol.View({
            center: ol.proj.fromLonLat([centerLon, centerLat]),
            zoom: change
        })
    });

    const userMarker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([userLon, userLat]))
    });

    const stopMarker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([stopLon, stopLat]))
    });

    userMarker.setStyle(new ol.style.Style({
        image: new ol.style.Icon({ src: 'map-marker.ico' })
    }));

    stopMarker.setStyle(new ol.style.Style({
        image: new ol.style.Icon({ src: 'bus-icon.ico' })
    }));

    map.addLayer(new ol.layer.Vector({
        source: new ol.source.Vector({ features: [userMarker] })
    }));

    map.addLayer(new ol.layer.Vector({
        source: new ol.source.Vector({ features: [stopMarker] })
    }));
}

geoFindMe();
const radiusSelect = document.getElementById("distance");
radiusSelect.addEventListener('change', function () {
    if (userLat && userLng) {
        findNearbyStops(userLat, userLng);
    }
});