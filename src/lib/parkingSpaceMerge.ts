import type { ParkingSpaceDto, ParkingSpace } from "./types";

/** Merge OSM list with backend review/comment aggregates (incl. avgRating). */
export function mergeParkingSpaces(osm: ParkingSpace[], spaces: ParkingSpaceDto[] | undefined): ParkingSpace[] {
    if (!osm.length) return osm;
    const agg = new Map<number, ParkingSpaceDto>();
    for (const s of spaces ?? []) agg.set(s.osmId, s);

    return osm.map((p) => {
        const a = agg.get(p.osmId);
        if (!a) return p;
        return {
            ...p,
            reviewCount: a.reviews ?? 0,
            commentCount: a.comments ?? 0,
            rating: a.avgRating ?? 0,
        };
    });
}
