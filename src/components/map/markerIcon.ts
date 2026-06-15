import L from "leaflet";
import type { Parkplatz } from "@/lib/types";
import { cn } from "@/lib/utils";

const HIKER_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`;
const PARKING_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="white"><text x="12" y="18" text-anchor="middle" font-size="18" font-weight="800" font-family="system-ui" fill="white">P</text></svg>`;

export function pinIcon(p: Parkplatz, active: boolean): L.DivIcon {
    //can be yes, no, dontaion, unknown or some text or a number
    const isFee = !["no", "unknown", "donation", undefined, null].includes(p.tags?.fee);
    const isHiker = p.istWanderparkplatz;

    const cls = cn(
        "wp-marker-pin",
        isFee && "bg-red-500!",
        isHiker ? "is-wander" : "is-normal",
        active && "is-active"
    );

    const label = isHiker ? "Wandern" : "Parken";
    const icon = isHiker ? HIKER_SVG : PARKING_SVG;

    return L.divIcon({
        className: "wp-marker",
        html: `<div class="${cls}">${icon}<span>${label}</span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
}
