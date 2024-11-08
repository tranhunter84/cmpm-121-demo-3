import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";

// CORE VARIABLES
const playerLocation: [number, number] = [
  36.98949379578401,
  -122.06277128548504,
];
const app: HTMLDivElement = document.querySelector("#app")!;
const appTitle = "Geocoin Carrier";
const header = document.createElement("h1");
const button = document.createElement("button");
const mapContainer = document.createElement("div");

// HELPER FUNCTIONS
function initializeMap(mapContainer: HTMLElement) {
  const map = leaflet.map(mapContainer, {
    center: playerLocation,
    zoom: 18,
  });

  // Add a tile layer to the map
  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(map);

  leaflet
    .marker(playerLocation)
    .addTo(map)
    .bindPopup("You are here!")
    .openPopup();
}

// App Title & Header
document.title = appTitle;
header.innerHTML = appTitle;

// Adding Basic Button
button.textContent = "Click me!";
button.addEventListener("click", () => {
  alert("You clicked the button!");
});
button.style.backgroundColor = "white";
button.style.color = "black";
button.style.border = "2px solid black";

// Map Container (Initializes Empty Square 500x500 pixels)
mapContainer.style.width = "500px";
mapContainer.style.height = "500px";
mapContainer.style.backgroundColor = "#ccc";
mapContainer.style.margin = "0 auto";

// Putting it all together
app.append(header);
app.append(button);
app.append(mapContainer);
initializeMap(mapContainer);
