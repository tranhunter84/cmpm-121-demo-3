// deno task dev

import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board, Cell } from "./board.ts";
import luck from "./luck.ts";

// CORE VARIABLES
let map: leaflet.Map;
let geolocationID: number | null = null;

const playerLocation: [number, number] = [
  36.98949379578401,
  -122.06277128548504,
];
const cellLength = 0.001;
const cellStep = 0.0001;
const gridLength = 8;
const cacheDensity = 0.1;
const movementHistory: leaflet.LatLng[] = [];
const movementPath = leaflet.polyline([], { color: "blue" });

const app: HTMLDivElement = document.querySelector("#app")!;
const appTitle = "Geocoin Carrier";
const header = document.createElement("h1");
const mapContainer = document.createElement("div");

const cacheCoins: {
  [key: string]: { i: number; j: number; serial: number }[];
} = {};
const playerCoins: { i: number; j: number; serial: number }[] = [];

// Variables to use board & cell from board.ts
const boardTileWidth = 0.001;
const boardTileVisibility = 8;
const board = new Board(boardTileWidth, boardTileVisibility);

// Buttons
const moveButtons = document.createElement("div") as HTMLElement;
const updatePositionButton = document.createElement("button");
const resetButton = document.createElement("button");

// INTERFACES
interface ExtendedGlobalThis {
  collectCoin: (cacheID: string, serial: number) => void;
  depositCoins: (cacheID: string) => void;
}

interface Memento<T> {
  toMomento(): T;
  fromMomento(memento: T): void;
}

class Geocache implements Memento<string> {
  i: number;
  j: number;
  coins: { i: number; j: number; serial: number }[];

  constructor(
    i: number,
    j: number,
    coins: { i: number; j: number; serial: number }[],
  ) {
    this.i = i;
    this.j = j;
    this.coins = coins;
  }

  toMomento(): string {
    return JSON.stringify(this.coins);
  }

  fromMomento(memento: string): void {
    this.coins = JSON.parse(memento);
  }
}

// HELPER FUNCTIONS
function _initializeMap(mapContainer: HTMLElement) {
  map = leaflet.map(mapContainer, {
    center: playerLocation,
    zoom: 15,
  });

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

  // Initialize movementPath polyline after the map is created
  movementPath.addTo(map);

  generateCaches(map);
}

function generateCaches(map: leaflet.Map) {
  const [lat, lng] = playerLocation;
  let cacheLabel = 0;

  for (let dx = -gridLength; dx <= gridLength; dx++) {
    for (let dy = -gridLength; dy <= gridLength; dy++) {
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= gridLength && Math.random() < cacheDensity) {
        const cacheLat = lat + dx * cellLength;
        const cacheLng = lng + dy * cellLength;
        const cacheID = `cache-${cacheLabel}`;

        const cell = board.getCellForPoint(
          new leaflet.LatLng(cacheLat, cacheLng),
        );
        generateCacheCoin(cacheID, distance, cell);
        const popupText = createPopupContent(cacheID, cacheCoins[cacheID]);

        const marker = leaflet
          .marker([cacheLat, cacheLng])
          .addTo(map)
          .bindPopup(popupText)
          .on("popupopen", () => {
            marker._popup.setContent(
              createPopupContent(cacheID, cacheCoins[cacheID]),
            );
          });

        cacheLabel += 1;
      }
    }
  }
}

function createPopupContent(
  cacheID: string,
  coins: { i: number; j: number; serial: number }[],
): string {
  const coinListHTML = coins
    .map(
      (coin) => `
        <div>
          ${coin.i}:${coin.j}#${coin.serial} 
          <button onclick="globalThis.collectCoin('${cacheID}', ${coin.serial})">Collect</button>
        </div>
      `,
    )
    .join("");

  const coinCountText = `${coins.length} coin(s) available`;

  return `
    <div>
      <strong>Cache #${cacheID.split("-")[1]}</strong><br>
      Coins available: ${coinCountText}<br>
      ${coinListHTML}
      <br>
      <button onclick="globalThis.depositCoins('${cacheID}')">Deposit Coins</button>
    </div>
  `;
}

(globalThis as unknown as ExtendedGlobalThis).collectCoin = function (
  cacheID: string,
  serial: number,
) {
  const cacheCoinsIndex = cacheCoins[cacheID].findIndex((coin) =>
    coin.serial === serial
  );
  if (cacheCoinsIndex !== -1) {
    const [collectedCoin] = cacheCoins[cacheID].splice(cacheCoinsIndex, 1);
    playerCoins.push(collectedCoin);
    updatePlayerInventory();
    updateCachePopup(cacheID);
    updatePersistentData();
  } else {
    alert("Coin doesn't exist (or already collected).");
  }
};

(globalThis as unknown as ExtendedGlobalThis).depositCoins = function (
  cacheID: string,
) {
  const coinsToDeposit = Math.min(playerCoins.length, 5);
  if (coinsToDeposit > 0) {
    const depositedCoins = playerCoins.splice(0, coinsToDeposit);
    cacheCoins[cacheID] = [...cacheCoins[cacheID], ...depositedCoins];
    updatePlayerInventory();
    updateCachePopup(cacheID);
  } else {
    alert("You do not own any coins to deposit.");
  }
};

function updatePlayerInventory() {
  const inventoryContainer = document.getElementById("player-coins");
  if (inventoryContainer) {
    inventoryContainer.innerHTML = `
      <strong>Player Coins:</strong><br>
      ${
      playerCoins
        .map(
          (coin) =>
            `<div>
                        <span onclick="centerMapOnCache('${coin.serial}')">
                          ${coin.i}:${coin.j}#${coin.serial}
                        </span>
                     </div>`,
        )
        .join("")
    }
    `;
  }
}

function updateCachePopup(cacheID: string) {
  const _markers = map.eachLayer((layer: leaflet.Layer) => {
    if (layer instanceof leaflet.Marker && layer._popup) {
      if (layer._popup.getContent().includes(cacheID)) {
        layer._popup.setContent(
          createPopupContent(cacheID, cacheCoins[cacheID]),
        );
      }
    }
  });
}

function generateCacheCoin(cacheName: string, distance: number, cell: Cell) {
  if (!cell || isNaN(cell.i) || isNaN(cell.j)) {
    console.error("Invalid cell data", cell);
    return;
  }

  const preservedMemento = localStorage.getItem(cacheName);
  const cache = new Geocache(cell.i, cell.j, []);

  if (preservedMemento) {
    cache.fromMomento(preservedMemento);
  } else {
    let cacheCoinCount = Math.floor(luck(cacheName) * distance);
    cacheCoinCount = Math.max(1, cacheCoinCount);

    cache.coins = Array.from({ length: cacheCoinCount }, (_, serial) => ({
      i: cell.i,
      j: cell.j,
      serial,
    }));
  }

  cacheCoins[cacheName] = cache.coins;
  localStorage.setItem(cacheName, cache.toMomento());
}

function movePlayer(direction: string) {
  if (direction === "up") playerLocation[0] += cellStep;
  else if (direction === "down") playerLocation[0] -= cellStep;
  else if (direction === "left") playerLocation[1] -= cellStep;
  else if (direction === "right") playerLocation[1] += cellStep;

  map.setView(playerLocation);
  refreshCaches();
}

function refreshCaches() {
  map.eachLayer((layer: leaflet.Layer) => {
    if (layer instanceof leaflet.Marker && layer.getPopup()) {
      const cacheID = layer.getPopup()!.getContent().match(/Cache #(\d+)/)?.[1];
      if (cacheID && cacheCoins[cacheID]) {
        layer.getPopup()!.setContent(
          createPopupContent(cacheID, cacheCoins[cacheID]),
        );
      }
    }
  });
}

function enableGeolocation() {
  if (geolocationID === null) {
    geolocationID = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        movePlayerToLocation(latitude, longitude);
      },
      (error) => {
        console.error("ERROR: could not enable geolocation:", error);
        alert("Can't access geolocation.");
      },
      { enableHighAccuracy: true },
    );
    alert("Geolocation ACIVE.");
  } else {
    navigator.geolocation.clearWatch(geolocationID);
    geolocationID = null;
    alert("Geolocation INACTIVE.");
  }
}

function updateMovementHistory(lat: number, lng: number) {
  movementHistory.push(new leaflet.LatLng(lat, lng));
  movementPath.setLatLngs(movementHistory);
}

function movePlayerToLocation(latitude: number, longitude: number) {
  playerLocation[0] = latitude;
  playerLocation[1] = longitude;
  map.setView(playerLocation);
  updateMovementHistory(latitude, longitude);
  refreshCaches();
}

function updatePersistentData() {
  localStorage.setItem("playerCoins", JSON.stringify(playerCoins));
  localStorage.setItem("playerLocation", JSON.stringify(playerLocation));
}

function resetGameState() {
  if (confirm("Are you sure you want to erase your game state?")) {
    localStorage.clear();
    playerCoins.length = 0;
    movementHistory.length = 0;
    movementPath.setLatLngs([]);
    Object.keys(cacheCoins).forEach((cacheID) => {
      const cache = new Geocache(0, 0, []);
      cache.fromMomento(localStorage.getItem(cacheID) || "[]");
      cacheCoins[cacheID] = cache.coins;
    });
    alert("Game state has been reset.");
    location.reload();
  }
}

function centerMapOnCache(cacheID: string) {
  const cache = cacheCoins[cacheID];
  if (cache && cache.length > 0) {
    const { i, j } = cache[0];
    const [lat, lng] = [i * cellLength, j * cellLength];
    map.setView([lat, lng], 15);
  }
}

// MAIN PROGRAM

// App Title & Header
document.title = appTitle;
header.innerHTML = appTitle;

moveButtons.id = "movement-controls";
moveButtons.innerHTML = `
  <button id="up">⬆️</button>
  <button id="down">⬇️</button>
  <button id="left">⬅️</button>
  <button id="right">➡️</button>
`;
app.append(moveButtons);

updatePositionButton.id = "enable-geolocation";
updatePositionButton.innerHTML = "🌐";
moveButtons.append(updatePositionButton);

resetButton.id = "reset-game";
resetButton.innerHTML = "🚮";
moveButtons.append(resetButton);

document.getElementById("up")!.onclick = () => movePlayer("up");
document.getElementById("down")!.onclick = () => movePlayer("down");
document.getElementById("left")!.onclick = () => movePlayer("left");
document.getElementById("right")!.onclick = () => movePlayer("right");
document.getElementById("enable-geolocation")!.onclick = enableGeolocation;
document.getElementById("reset-game")!.onclick = resetGameState;

globalThis.addEventListener("load", () => {
  const savedPlayerCoins = localStorage.getItem("playerCoins");
  if (savedPlayerCoins) {
    playerCoins.push(...JSON.parse(savedPlayerCoins));
  }

  const savedPlayerLocation = localStorage.getItem("playerLocation");
  if (savedPlayerLocation) {
    const [lat, lng] = JSON.parse(savedPlayerLocation);
    playerLocation[0] = lat;
    playerLocation[1] = lng;
    map.setView(playerLocation);
  }
});

// Map Container (Initializes Empty Square 500x500 pixels)
mapContainer.style.width = "500px";
mapContainer.style.height = "500px";
mapContainer.style.backgroundColor;
app.appendChild(mapContainer);
_initializeMap(mapContainer);
centerMapOnCache(map);
