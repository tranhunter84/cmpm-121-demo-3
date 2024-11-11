import leaflet from "leaflet";

// Define the interface for Cell
export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = `${i},${j}`;

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }

    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor((point.lat * 100000) / this.tileWidth);
    const j = Math.floor((point.lng * 100000) / this.tileWidth);

    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const southWest = new leaflet.LatLng(
      i * this.tileWidth,
      j * this.tileWidth,
    );
    const northEast = new leaflet.LatLng(
      (i + 1) * this.tileWidth,
      (j + 1) * this.tileWidth,
    );

    return new leaflet.LatLngBounds(southWest, northEast);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);

    for (
      let dx = -this.tileVisibilityRadius;
      dx <= this.tileVisibilityRadius;
      dx++
    ) {
      for (
        let dy = -this.tileVisibilityRadius;
        dy <= this.tileVisibilityRadius;
        dy++
      ) {
        const cell = this.getCanonicalCell({
          i: originCell.i + dx,
          j: originCell.j + dy,
        });
        resultCells.push(cell);
      }
    }

    return resultCells;
  }
}
