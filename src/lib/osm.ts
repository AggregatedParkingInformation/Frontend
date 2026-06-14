import type { Parkplatz } from "./types";
import { readTile, tileBbox, tilesForBbox, writeTile, type Tile } from "./osmCache";

const API_URL = (import.meta.env.VITE_PARKING_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type Bbox = { south: number; west: number; north: number; east: number };

/** Wire format returned by GET /parking/bbox. */
type ApiParkingSpot = {
    osm_id: number;
    name: string;
    lat: number;
    lon: number;
    is_hiker: boolean;
    tags: Record<string, string>;
};

type ApiResponse = ApiParkingSpot[];

function toParkplatz(s: ApiParkingSpot): Parkplatz | null {
    if (s.tags.bus == "designated") return null;
    return {
        osmId: s.osm_id,
        name: s.name,
        lat: s.lat,
        lng: s.lon,
        istWanderparkplatz: s.tags.hiking == "yes",
        region: s.tags["addr:city"] ?? "",
        tags: s.tags,
        bewertung: 0,
        anzahlBewertungen: 0,
        anzahlKommentare: 0,
    };
}

async function fetchTile(t: Tile, signal?: AbortSignal): Promise<Parkplatz[]> {
    const b = tileBbox(t);
    const url =
        `${API_URL}/parking?min_lat=${b.south}&min_lon=${b.west}` + `&max_lat=${b.north}&max_lon=${b.east}&limit=5000`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Parking API ${res.status}`);
    const json = (await res.json()) as ApiResponse;
    return json.map(toParkplatz).filter((p) => p != null);
}

export async function fetchParkplaetzeInBbox(b: Bbox, signal?: AbortSignal): Promise<Parkplatz[]> {
    const tiles = tilesForBbox(b);
    const collected: Parkplatz[] = [];

    const cachedReads = await Promise.all(tiles.map((t) => readTile(t)));
    const missing: Tile[] = [];
    tiles.forEach((t, i) => {
        const cached = cachedReads[i];
        if (cached) collected.push(...cached);
        else missing.push(t);
    });

    // Fetch all missing tiles in parallel — backend handles each in <100ms.
    const fetched = await Promise.all(missing.map((t) => fetchTile(t, signal)));
    await Promise.all(
        missing.map(async (t, i) => {
            const data = fetched[i];
            await writeTile(t, data);
            collected.push(...data);
        }),
    );

    // Dedupe by osmId (tiles can overlap on borders).
    const seen = new Set<number>();
    return collected.filter((p) => {
        if (seen.has(p.osmId)) return false;
        seen.add(p.osmId);
        return true;
    });
}
