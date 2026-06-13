import type { ParkingSpaceDto, Parkplatz } from "./types";

/** Merge OSM list with backend review/comment aggregates (incl. avgRating). */
export function mergeParkplaetze(osm: Parkplatz[], spaces: ParkingSpaceDto[] | undefined): Parkplatz[] {
    if (!osm.length) return osm;
    const agg = new Map<number, ParkingSpaceDto>();
    for (const s of spaces ?? []) agg.set(s.osmId, s);

    return osm.map((p) => {
        const a = agg.get(p.osmId);
        if (!a) return p;
        return {
            ...p,
            anzahlBewertungen: a.reviews ?? 0,
            anzahlKommentare: a.comments ?? 0,
            bewertung: a.avgRating ?? 0,
        };
    });
}
