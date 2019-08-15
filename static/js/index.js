const handler = new MapEventHandler();

function onMarkerClick(data) {
    
    if (!handler.isStartPointSet && !handler.isPredicted) {
        console.log(data);
        // new starting point
        handler.setStartPoint(data);
        var popularStations = data['target']['options']['popular'];
        var keys = Object.keys(popularStations);
        var startCoords = data['latlng'];
        var startName = data['target']['options']['name'];

        for (key in popularStations) {
            // get top 3 most popular endpoints from current station
            var popularCoords = popularStations[key];
            var latlngStart = [startCoords['lat'], startCoords['lng']];
            var latlngEnd = [popularCoords['latitude'], popularCoords['longitude']];
            var latlng = [latlngStart, latlngEnd];
            
            var poly = L.polyline(latlng);
            poly.setStyle({color: 'black'});
            poly.addTo(map);
        }

        $('.notice-current').html('<strong>Start</strong> ' + startName);
        $('.notice-current').toggle();

        for (i = 0; i <= 2; i++) {
            // toggle most popular stations
            var key = keys[i];
            var name = popularStations[key]['name'];
            $('.notice-popular-' + i).toggle();
            $('.notice-popular-' + i).html('<strong>Popular destination</strong> ' + name);
        }

    } else if (handler.isStartPointSet && !handler.isPredicted) {
        // set end point and await prediction
        handler.setEndPoint(data).then(function (datum) {
            clearAllPolylines();

            var startCoords = handler.startStationCoords;
            var currentCoords = data['latlng'];
            var latlng = [
                [startCoords['lat'], startCoords['lng']],
                [currentCoords['lat'], currentCoords['lng']]
            ];

            var poly = L.polyline(latlng);
            poly.setStyle({color: 'red'});
            poly.addTo(map);

            for (i = 0; i <= 2; i++) {
                // turn off most popular routes
                $('.notice-popular-' + i).toggle();
            }
            
            // parse time
            var min = parseInt(datum['predicted']);
            var sec = Math.round((datum['predicted'] - min) * 60);
            var total = min + ' minutes ' + sec + ' seconds'
            var endName = data['target']['options']['name'];
            
            // toggle notes with updated text
            $('.notice-predicted').html('<strong>Predicted trip time</strong> ' + total);
            $('.notice-end').html('<strong>End</strong> ' + endName);
            $('.notice-end').toggle();
            $('.notice-predicted').toggle();
        });

    }
}

function onMapClick(data) {

    if (handler.isPredicted && handler.isStartPointSet) {
        // prediction has been made reset map to original state
        handler.reset();
        clearAllPolylines();
        $('.notice-current').toggle();
        $('.notice-end').toggle();
        $('.notice-predicted').toggle();

    } else if (!handler.isPredicted && handler.isStartPointSet) {
        // reset without prediction on user call
        handler.startPointSet = false;
        clearAllPolylines();
        $('.notice-current').toggle();
        
        for (i = 0; i <= 2; i++) {
            $('.notice-popular-' + i).toggle();
        }

    }
}

function clearAllPolylines() {
    // src https://stackoverflow.com/questions/14585688/clear-all-polylines-from-leaflet-map
    for(i in map._layers) {
        if(map._layers[i]._path != undefined) {
            try {
                map.removeLayer(map._layers[i]);
            }
            catch(e) {
                console.log("problem with " + e + map._layers[i]);
            }
        }
    }
}

var map = L.map('map').setView([37.788850, -122.401967], 14);
map.on('click', onMapClick);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">\
        OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">\
        CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: config['mapboxApiKey']
}).addTo(map);

$.ajax({
    type: 'GET',
    url: '/get_stations',
    contentType: 'application/json',
    success: function(data) {
        var i = 0;

        for (var key in data) {
            // load all stations with id and metadata
            var station = data[key];
            // that's a big nono. TODO store station color in names.json
            const color = palette[i.toString()]['hex'];
            i++;

            // src https://stackoverflow.com/questions/23567203/leaflet-changing-marker-color
            const markerHtmlStyles = `
                background-color: ${color};
                width: 1.5rem;
                height: 1.5rem;
                display: block;
                left: -1.5rem;
                top: -1.5rem;
                position: relative;
                border-radius: 3rem 3rem 0;
                transform: rotate(45deg);
                border: 1px solid #FFFFFF`;

            const icon = L.divIcon({
                className: "my-custom-pin",
                iconAnchor: [-10, 4],
                labelAnchor: [0, 0],
                popupAnchor: [0, 0],
                html: `<span style="${markerHtmlStyles}" />`
            });

            var marker = L.marker(
                [station['latitude'], station['longitude']],
                {id: key, name: station['name'], popular: data[key]['pop_dest'], icon: icon, icolor: color}
            );

            marker.addTo(map);
            marker.bindTooltip(station['name']);
            marker.on('click', onMarkerClick);
        }
    }
});
