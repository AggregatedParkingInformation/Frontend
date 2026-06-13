import { createStore, get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { Parkplatz } from "./types";

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days — IndexedDB has plenty of room
export const TILE = 0.02; // ~2km tile size (degrees)

export type Tile = { x: number; y: number };
type Entry = { ts: number; data: Parkplatz[] };

const store = createStore("wanderpark", "osm-tiles");

// In-memory layer so repeated map pans don't hit IndexedDB for the same tile.
const memCache = new Map<string, Entry>();

function tileId(t: Tile): string {
    return `${t.x}_${t.y}`;
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

function isFresh(e: Entry): boolean {
    return Date.now() - e.ts <= TTL_MS;
}

export async function readTile(t: Tile): Promise<Parkplatz[] | null> {
    const id = tileId(t);
    const mem = memCache.get(id);
    if (mem) return isFresh(mem) ? mem.data : (memCache.delete(id), null);
    try {
        const entry = (await idbGet<Entry>(id, store)) ?? null;
        if (!entry) return null;
        if (!isFresh(entry)) {
            void idbDel(id, store).catch(() => {});
            return null;
        }
        memCache.set(id, entry);
        return entry.data;
    } catch {
        return null;
    }
}

export async function writeTile(t: Tile, data: Parkplatz[]): Promise<void> {
    const id = tileId(t);
    const entry: Entry = { ts: Date.now(), data };
    memCache.set(id, entry);
    try {
        await idbSet(id, entry, store);
    } catch {
        /* ignore — in-mem still serves it for this session */
    }
}
