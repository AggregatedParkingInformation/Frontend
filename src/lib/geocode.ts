export type PlaceSuggestion = {
    id: string;
    label: string;
    lat: number;
    lng: number;
    type?: string;
    boundingBox?: [number, number, number, number]; // south, north, west, east
};

/**
 * Searches places via OpenStreetMap Nominatim.
 * Free, rate-limited to ~1 req/s — debounce before calling.
 */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("accept-language", "de");

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        type?: string;
        class?: string;
        boundingbox?: [string, string, string, string];
    }>;
    return data.map((d) => ({
        id: String(d.place_id),
        label: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        type: d.type ?? d.class,
        boundingBox: d.boundingbox
            ? [
                  parseFloat(d.boundingbox[0]),
                  parseFloat(d.boundingbox[1]),
                  parseFloat(d.boundingbox[2]),
                  parseFloat(d.boundingbox[3]),
              ]
            : undefined,
    }));
}
