import type { Parkplatz } from "./types";
import { readTile, TILE, tileBbox, tilesForBbox, writeTile, type Tile } from "./osmCache";

const OVERPASS = import.meta.env.VITE_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

type OsmElement = {
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
};

export type Bbox = { south: number; west: number; north: number; east: number };

function isHiker(tags: Record<string, string> = {}): boolean {
    const name = (tags.name ?? "").toLowerCase();
    return (
        tags.hiking === "yes" ||
        tags.access === "hikers" ||
        tags.parking === "hiker" ||
        /wander|hiking|trailhead/.test(name)
    );
}

function mapElement(el: OsmElement): Parkplatz | null {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) return null;
    const tags = el.tags ?? {};
    if (tags.parking === "lane" || tags.access === "private") return null;
    const name = tags.name ?? (isHiker(tags) ? "Wanderparkplatz" : "Parkplatz");
    const region = tags["addr:city"] ?? tags["addr:suburb"] ?? tags.operator ?? "";
    return {
        osmId: el.id,
        name,
        lat,
        lng,
        istWanderparkplatz: isHiker(tags),
        region,
        bewertung: 0,
        anzahlBewertungen: 0,
        anzahlKommentare: 0,
    };
}

async function fetchTiles(tiles: Tile[], signal?: AbortSignal): Promise<Map<string, Parkplatz[]>> {
    // Build one Overpass query union over all missing tile bboxes
    const parts = tiles
        .map((t) => {
            const b = tileBbox(t);
            return `node["amenity"="parking"](${b.south},${b.west},${b.north},${b.east});way["amenity"="parking"](${b.south},${b.west},${b.north},${b.east});`;
        })
        .join("");
    const q = `[out:json][timeout:25];(${parts});out center tags 500;`;
    const res = await fetch(OVERPASS, {
        method: "POST",
        body: "data=" + encodeURIComponent(q),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = (await res.json()) as { elements: OsmElement[] };
    const items = json.elements.map(mapElement).filter((x): x is Parkplatz => x !== null);

    // Bucket each item into a tile (by lat/lng)
    const buckets = new Map<string, Parkplatz[]>();
    for (const t of tiles) buckets.set(`${t.x}_${t.y}`, []);
    for (const p of items) {
        const x = Math.floor(p.lng / TILE);
        const y = Math.floor(p.lat / TILE);
        const key = `${x}_${y}`;
        const arr = buckets.get(key);
        if (arr) arr.push(p);
    }
    return buckets;
}

export async function fetchParkplaetzeInBbox(b: Bbox, signal?: AbortSignal): Promise<Parkplatz[]> {
    const tiles = tilesForBbox(b);
    const missing: Tile[] = [];
    const collected: Parkplatz[] = [];

    for (const t of tiles) {
        const cached = readTile(t);
        if (cached) collected.push(...cached);
        else missing.push(t);
    }

    if (missing.length > 0) {
        // Cap per request to avoid huge Overpass queries; chunk in batches of 25 tiles
        const CHUNK = 25;
        for (let i = 0; i < missing.length; i += CHUNK) {
            const chunk = missing.slice(i, i + CHUNK);
            const buckets = await fetchTiles(chunk, signal);
            for (const t of chunk) {
                const data = buckets.get(`${t.x}_${t.y}`) ?? [];
                writeTile(t, data);
                collected.push(...data);
            }
        }
    }

    // Dedupe by osmId
    const seen = new Set<number>();
    return collected.filter((p) => {
        if (seen.has(p.osmId)) return false;
        seen.add(p.osmId);
        return true;
    });
}
