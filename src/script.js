async function init() {
	const userCoords = await getUserCoords();

	const map = new google.maps.Map(document.getElementById("map"), {
		center: {
			lat: userCoords.coords.latitude,
			lng: userCoords.coords.longitude,
		},
		zoom: 10,
	});

	let markers = [];

	const infowindow = new google.maps.InfoWindow();

	google.maps.event.addListener(
		map,
		"bounds_changed",
		debounce(async () => {
			const bounds = map.getBounds();
			const bbox = getMapBbox(map);

			// remove invisible markers
			markers.forEach(marker => {
				if (!bounds.contains(marker.getPosition())) {
					marker.setMap(null);
				}
			});

			const weatherData = await getWeatherData({
				apiKey: "bc896bf805344fc5ef0f2281e3758aff",
				bbox,
			});

			markers = createWeatherMarkers(map, weatherData);

			markers.forEach(marker => {
				marker.addListener("click", () => {
					infowindow.setContent(`
          <div>
            <span>City:</span> <b>${marker.weatherData.name}</b><br />
            <span>Temperature:</span> <b>${
							marker.weatherData.main.temp
						}°C</b><br />
            <span>Humidity:</span> <b>${
							marker.weatherData.main.humidity
						}%</b><br />
            <span>Wind:</span> <b>${(
							marker.weatherData.wind.speed * 3.6
						).toFixed(2)}km/h</b><br />
          </div>
          `);

					infowindow.open(map, marker);
				});
			});
		}, 1000)
	);
}

function createWeatherMarkers(map, weatherData) {
	const markers = weatherData.map(point => {
		const weather = point.weather[0];

		return new google.maps.Marker({
			map,
			position: { lat: point.coord.Lat, lng: point.coord.Lon },
			title: `${point.name}, ${weather?.description || "N/A"}`,
			icon: `http://openweathermap.org/img/wn/${weather?.icon}@2x.png`,
			weatherData: point,
		});
	});

	return markers;
}

function getMapBbox(map) {
	const ne = map.getBounds().getNorthEast();
	const sw = map.getBounds().getSouthWest();

	return [ne.lng(), sw.lat(), sw.lng(), ne.lat()];
}

async function getWeatherData({ apiKey = "", bbox }) {
	/** Return example
    [
      {
        "id": 2208791,
        "name": "Yafran",
        "coord": {
          "lon": 12.52859,
          "lat": 32.06329
        },
        "main": {
          "temp": 9.68,
          "temp_min": 9.681,
          "temp_max": 9.681,
          "pressure": 961.02,
          "sea_level": 1036.82,
          "grnd_level": 961.02,
          "humidity": 85
        },
        "dt": 1485784982,
        "wind": {
          "speed": 3.96,
          "deg": 356.5
        },
        "rain": {
          "3h": 0.255
        },
        "clouds": {
          "all": 88
        },
        "weather": [
          {
            "id": 500,
            "main": "Rain",
            "description": "light rain",
            "icon": "10d"
          }
        ]
      },
    ]
  */
	const response = await fetch(
		`http://api.openweathermap.org/data/2.5/box/city?appid=${apiKey}&bbox=${bbox}`
	);

	const data = await response.json();

	if (response.status === 200) {
		return data.list || [];
	}

	alert(`Failed to fetch weather data.\nReason: ${data.message}`);
	return [];
}

// Utils
function getUserCoords() {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, reject);
	});
}

function debounce(f, ms) {
	let isCooldown = false;

	return function () {
		if (isCooldown) return;

		f.apply(this, arguments);

		isCooldown = true;

		setTimeout(() => (isCooldown = false), ms);
	};
}
