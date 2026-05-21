import type { Parkplatz } from "./types";

const TTL_MS = 1000 * 60 * 60 * 24; // 24h
const PREFIX = "wp:osm:tile:";
const INDEX_KEY = "wp:osm:tile:index";
const MAX_ENTRIES = 400;
export const TILE = 0.02; // ~2km tile size (degrees)

export type Tile = { x: number; y: number };
type Entry = { ts: number; data: Parkplatz[] };

export function tileKey(t: Tile): string {
    return `${PREFIX}${t.x}_${t.y}`;
}

/** Tile bbox in lat/lng. x = lon index, y = lat index (south edge). */
export function tileBbox(t: Tile) {
    return {
        south: t.y * TILE,
        north: (t.y + 1) * TILE,
        west: t.x * TILE,
        east: (t.x + 1) * TILE,
    };
}

export function tilesForBbox(b: { south: number; west: number; north: number; east: number }): Tile[] {
    const x0 = Math.floor(b.west / TILE);
    const x1 = Math.floor(b.east / TILE);
    const y0 = Math.floor(b.south / TILE);
    const y1 = Math.floor(b.north / TILE);
    const tiles: Tile[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push({ x, y });
    return tiles;
}

function readIndex(): string[] {
    try {
        return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    } catch {
        return [];
    }
}

function writeIndex(keys: string[]) {
    try {
        localStorage.setItem(INDEX_KEY, JSON.stringify(keys));
    } catch {
        /* ignore quota */
    }
}

function touch(key: string) {
    const idx = readIndex().filter((k) => k !== key);
    idx.push(key);
    while (idx.length > MAX_ENTRIES) {
        const drop = idx.shift();
        if (drop) localStorage.removeItem(drop);
    }
    writeIndex(idx);
}

export function readTile(t: Tile): Parkplatz[] | null {
    try {
        const key = tileKey(t);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as Entry;
        if (Date.now() - entry.ts > TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

export function writeTile(t: Tile, data: Parkplatz[]) {
    try {
        const key = tileKey(t);
        const entry: Entry = { ts: Date.now(), data };
        localStorage.setItem(key, JSON.stringify(entry));
        touch(key);
    } catch {
        /* quota — ignore */
    }
}
