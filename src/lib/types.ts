// Backend DTOs (OpenAPI)
export type UserDto = { id: number; username: string };
export type UserPostRequestDto = { username: string; password: string };
export type ReviewDto = {
    id: number;
    osmId: number;
    stars: number;
    reviewText: string;
};
export type ReviewPostRequest = {
    osmId: number;
    stars: number;
    reviewText: string;
};
export type CommentDto = {
    id: number;
    osmId: number;
    username: string;
    score: number;
    commentText: string;
};
export type CommentPostRequest = { osmId: number; commentText: string };
export type PrivilegeDto = { id: number; name: string };
export type ParkingSpaceDto = {
    id: number;
    osmId: number;
    reviews: number;
    comments: number;
};

// Internal map type — merged OSM + backend aggregate
export type Parkplatz = {
    osmId: number;
    name: string;
    lat: number;
    lng: number;
    istWanderparkplatz: boolean;
    region: string;
    /** durchschnittliche Sterne, 0 wenn unbekannt */
    bewertung: number;
    anzahlBewertungen: number;
    anzahlKommentare: number;
};

export type LatLng = { lat: number; lng: number };

export function distanzKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}
