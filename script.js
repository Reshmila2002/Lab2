const elements = {
  cityInput: document.querySelector("#city-input"),
  currentDate: document.querySelector("#current-date"),
  currentIcon: document.querySelector("#current-icon"),
  currentTemperature: document.querySelector("#current-temperature"),
  feelsLike: document.querySelector("#feels-like"),
  forecastList: document.querySelector("#forecast-list"),
  forecastSummary: document.querySelector("#forecast-summary"),
  humidity: document.querySelector("#humidity-value"),
  locationName: document.querySelector("#location-name"),
  pressure: document.querySelector("#pressure-value"),
  status: document.querySelector("#status-message"),
  sunrise: document.querySelector("#sunrise-time"),
  sunset: document.querySelector("#sunset-time"),
  template: document.querySelector("#forecast-template"),
  unitToggle: document.querySelector("#unit-toggle"),
  updatedAt: document.querySelector("#updated-at"),
  visibility: document.querySelector("#visibility-value"),
  weatherDescription: document.querySelector("#weather-description"),
  wind: document.querySelector("#wind-value"),
};

const weatherCodes = {
  0: { label: "Clear sky", icon: "☀" },
  1: { label: "Mostly clear", icon: "🌤" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁" },
  45: { label: "Foggy", icon: "🌫" },
  48: { label: "Icy fog", icon: "🌫" },
  51: { label: "Light drizzle", icon: "🌦" },
  53: { label: "Drizzle", icon: "🌦" },
  55: { label: "Heavy drizzle", icon: "🌧" },
  61: { label: "Light rain", icon: "🌦" },
  63: { label: "Rain", icon: "🌧" },
  65: { label: "Heavy rain", icon: "🌧" },
  71: { label: "Light snow", icon: "🌨" },
  73: { label: "Snow", icon: "🌨" },
  75: { label: "Heavy snow", icon: "❄" },
  80: { label: "Rain showers", icon: "🌦" },
  81: { label: "Rain showers", icon: "🌧" },
  82: { label: "Heavy showers", icon: "⛈" },
  95: { label: "Thunderstorm", icon: "⛈" },
  96: { label: "Thunderstorm", icon: "⛈" },
  99: { label: "Thunderstorm", icon: "⛈" },
};

let unit = "celsius";
let lastWeather = null;

const getWeatherInfo = (code) => weatherCodes[code] ?? { label: "Unknown", icon: "☁" };
const degrees = (celsius) => unit === "celsius" ? Math.round(celsius) : Math.round((celsius * 9) / 5 + 32);
const degreeUnit = () => unit === "celsius" ? "°C" : "°F";
const windUnit = (kilometersPerHour) => unit === "celsius" ? `${Math.round(kilometersPerHour)} km/h` : `${Math.round(kilometersPerHour / 1.609)} mph`;
const formatTime = (dateString, timezone) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(dateString));
const formatDay = (dateString, index) => index === 0 ? "Today" : new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${dateString}T12:00:00`));

function setStatus(message = "") {
  elements.status.textContent = message;
}

function renderForecast(daily) {
  elements.forecastList.innerHTML = "";
  daily.time.slice(0, 5).forEach((day, index) => {
    const info = getWeatherInfo(daily.weather_code[index]);
    const card = elements.template.content.cloneNode(true);
    card.querySelector(".forecast-day").textContent = formatDay(day, index);
    card.querySelector(".forecast-icon").textContent = info.icon;
    card.querySelector(".forecast-condition").textContent = info.label;
    card.querySelector(".forecast-temp strong").textContent = `${degrees(daily.temperature_2m_max[index])}°`;
    card.querySelector(".forecast-temp span").textContent = `${degrees(daily.temperature_2m_min[index])}°`;
    elements.forecastList.append(card);
  });
}

function renderWeather(weather, place) {
  const { current, daily, timezone } = weather;
  const currentInfo = getWeatherInfo(current.weather_code);
  const placeName = place.country ? `${place.name}, ${place.country}` : place.name;
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: timezone }).format(new Date());

  elements.locationName.textContent = placeName;
  elements.currentDate.textContent = today;
  elements.currentIcon.textContent = currentInfo.icon;
  elements.currentTemperature.textContent = `${degrees(current.temperature_2m)}°`;
  elements.weatherDescription.textContent = currentInfo.label;
  elements.feelsLike.textContent = `Feels like ${degrees(current.apparent_temperature)}°`;
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.wind.textContent = windUnit(current.wind_speed_10m);
  elements.pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
  elements.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  elements.sunrise.textContent = formatTime(daily.sunrise[0], timezone);
  elements.sunset.textContent = formatTime(daily.sunset[0], timezone);
  elements.updatedAt.textContent = `Updated ${formatTime(current.time, timezone)}`;
  elements.forecastSummary.textContent = `${getWeatherInfo(daily.weather_code[0]).label} with a high of ${degrees(daily.temperature_2m_max[0])}°.`;
  renderForecast(daily);
}

async function loadWeather(place) {
  setStatus("Loading the latest forecast...");
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,visibility",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "5",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("Weather service is unavailable.");
    lastWeather = { weather: await response.json(), place };
    renderWeather(lastWeather.weather, place);
    setStatus("");
  } catch (error) {
    setStatus("Could not load live weather. Check your internet connection and try again.");
    console.error(error);
  }
}

async function searchCity(city) {
  const searchTerm = city.trim();
  if (!searchTerm) return;
  setStatus(`Finding ${searchTerm}...`);
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`);
    if (!response.ok) throw new Error("Search service is unavailable.");
    const result = await response.json();
    if (!result.results?.length) throw new Error("City not found.");
    elements.cityInput.value = "";
    await loadWeather(result.results[0]);
  } catch (error) {
    setStatus(error.message === "City not found." ? "We couldn't find that city. Try a nearby city or airport." : "Search is unavailable right now. Please try again.");
    console.error(error);
  }
}

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity(elements.cityInput.value);
});

document.querySelectorAll("[data-city]").forEach((button) => {
  button.addEventListener("click", () => searchCity(button.dataset.city));
});

document.querySelector("#location-button").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Your browser does not support location services.");
    return;
  }
  setStatus("Requesting your location...");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather({ name: "Your location", latitude: coords.latitude, longitude: coords.longitude }),
    () => setStatus("We couldn't access your location. Search for a city instead."),
    { timeout: 10000 },
  );
});

elements.unitToggle.addEventListener("click", () => {
  unit = unit === "celsius" ? "fahrenheit" : "celsius";
  elements.unitToggle.querySelectorAll("span").forEach((span, index) => span.classList.toggle("active-unit", (unit === "celsius" && index === 0) || (unit === "fahrenheit" && index === 1)));
  if (lastWeather) renderWeather(lastWeather.weather, lastWeather.place);
});

document.querySelector("#copyright-year").textContent = new Date().getFullYear();
loadWeather({ name: "Colombo", country: "Sri Lanka", latitude: 6.9271, longitude: 79.8612 });
