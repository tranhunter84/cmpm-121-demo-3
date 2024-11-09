import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";

// CORE VARIABLES
const playerLocation: [number, number] = [
  36.98949379578401,
  -122.06277128548504,
];
const cellLength = 0.001;
const gridLength = 8;
const cacheDensity = 0.1;

const app: HTMLDivElement = document.querySelector("#app")!;
const appTitle = "Geocoin Carrier";
const header = document.createElement("h1");
const button = document.createElement("button");
const mapContainer = document.createElement("div");

const cacheCoins: { [key: string]: number } = {};
let playerCoins = 0;

interface ExtendedGlobalThis {
  collectCoins: (cacheID: string) => void;
  depositCoins: (cacheID: string) => void;
}

// HELPER FUNCTIONS
function initializeMap(mapContainer: HTMLElement) {
  const map = leaflet.map(mapContainer, {
    center: playerLocation,
    zoom: 15,
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

  generateCaches(map);
}

function generateCaches(map: leaflet.Map) {
  const [lat, lng] = playerLocation;
  let cacheLabel = 0;

  for (let dx = -gridLength; dx <= gridLength; dx++) {
    for (let dy = -gridLength; dy <= gridLength; dy++) {
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only place caches if within 8 cell steps
      if (distance <= gridLength && Math.random() < cacheDensity) {
        const cacheLat = lat + dx * cellLength;
        const cacheLng = lng + dy * cellLength;
        const cacheID = `cache-${cacheLabel}`; // Updated to use backticks for interpolation

        // Deterministically generates offering of coins for each cache
        generateCacheCoin(cacheID, distance);

        const popupText = `
          <div>
            <strong>Cache #${cacheLabel}</strong><br>
            Coins available: <span id="${cacheID}-coins">${
          cacheCoins[cacheID]
        }</span><br>
            <button onclick="globalThis.collectCoins('${cacheID}')">Collect</button>
            <button onclick="globalThis.depositCoins('${cacheID}')">Deposit</button>
          </div>
        `;

        leaflet
          .marker([cacheLat, cacheLng])
          .addTo(map)
          .bindPopup(popupText);

        cacheLabel += 1;
      }
    }
  }
}

(globalThis as unknown as ExtendedGlobalThis).collectCoins = function (
  cacheID: string,
) {
  const coinsAvailable = cacheCoins[cacheID];
  if (coinsAvailable > 0) {
    playerCoins += coinsAvailable;
    cacheCoins[cacheID] = 0;
    updatePopupCoins(cacheID);
  } else {
    alert("This cache has no coins remaining to collect.");
  }
};

(globalThis as unknown as ExtendedGlobalThis).depositCoins = function (
  cacheID: string,
) {
  const coinsToDeposit = 5;
  if (playerCoins >= coinsToDeposit) {
    playerCoins -= coinsToDeposit;
    cacheCoins[cacheID] += coinsToDeposit;
    updatePopupCoins(cacheID);
  } else {
    alert("You do not own any coins to deposit.");
  }
};

function updatePopupCoins(cacheID: string) {
  const coinsDisplay = document.getElementById(`${cacheID}-coins`);
  if (coinsDisplay) {
    coinsDisplay.textContent = cacheCoins[cacheID].toString();
  }
}

function generateCacheCoin(cacheName: string, distance: number) {
  const coins = 10 * distance;
  cacheCoins[cacheName] = coins;
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
