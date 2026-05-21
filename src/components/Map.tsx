import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Parkplatz, LatLng } from "@/lib/types";
import type { Bbox } from "@/lib/osm";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function pinIcon(p: Parkplatz, active: boolean) {
    const cls = `wp-marker-pin ${p.istWanderparkplatz ? "is-wander" : "is-normal"} ${active ? "is-active" : ""}`;
    const label = p.istWanderparkplatz ? "Wandern" : "Parken";
    const icon = p.istWanderparkplatz
        ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`
        : `<svg width="11" height="11" viewBox="0 0 24 24" fill="white"><text x="12" y="18" text-anchor="middle" font-size="18" font-weight="800" font-family="system-ui" fill="white">P</text></svg>`;
    return L.divIcon({
        className: "wp-marker",
        html: `<div class="${cls}">${icon}<span>${label}</span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
}

function BboxReporter({ onBbox }: { onBbox: (b: Bbox) => void }) {
    const map = useMap();
    useEffect(() => {
        const b = map.getBounds();
        onBbox({
            south: b.getSouth(),
            west: b.getWest(),
            north: b.getNorth(),
            east: b.getEast(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useMapEvents({
        moveend: () => {
            const b = map.getBounds();
            onBbox({
                south: b.getSouth(),
                west: b.getWest(),
                north: b.getNorth(),
                east: b.getEast(),
            });
        },
    });
    return null;
}

function MapHandle({ handleRef }: { handleRef: React.MutableRefObject<MapHandleApi | null> }) {
    const map = useMap();
    useEffect(() => {
        handleRef.current = {
            flyTo: (lat, lng, zoom) =>
                map.flyTo([lat, lng], zoom ?? Math.max(map.getZoom(), 14), {
                    duration: 0.8,
                }),
            getCenter: () => {
                const c = map.getCenter();
                return { lat: c.lat, lng: c.lng };
            },
        };
        return () => {
            handleRef.current = null;
        };
    }, [map, handleRef]);
    return null;
}

export type MapHandleApi = {
    flyTo: (lat: number, lng: number, zoom?: number) => void;
    getCenter: () => LatLng;
};

type Props = {
    parkplaetze: Parkplatz[];
    userPos: LatLng | null;
    selectedId: number | null;
    onSelect: (p: Parkplatz) => void;
    onBboxChange: (b: Bbox) => void;
    initialCenter: LatLng;
};

export const Map = forwardRef<MapHandleApi, Props>(function Map(
    { parkplaetze, userPos, selectedId, onSelect, onBboxChange, initialCenter },
    ref,
) {
    const handleRef = useRef<MapHandleApi | null>(null);
    useImperativeHandle(ref, () => ({
        flyTo: (lat, lng, zoom) => handleRef.current?.flyTo(lat, lng, zoom),
        getCenter: () => handleRef.current?.getCenter() ?? initialCenter,
    }));

    const markers = useMemo(
        () =>
            parkplaetze.map((p) => (
                <Marker
                    key={p.osmId}
                    position={[p.lat, p.lng]}
                    icon={pinIcon(p, p.osmId === selectedId)}
                    eventHandlers={{ click: () => onSelect(p) }}
                />
            )),
        [parkplaetze, selectedId, onSelect],
    );

    return (
        <MapContainer
            className="w-screen h-screen z-0"
            center={[initialCenter.lat, initialCenter.lng]}
            zoom={15}
            minZoom={14}
            maxZoom={18}
            zoomControl={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapHandle handleRef={handleRef} />
            <BboxReporter onBbox={onBboxChange} />
            {userPos && (
                <Circle
                    center={[userPos.lat, userPos.lng]}
                    radius={120}
                    pathOptions={{
                        color: "hsl(215 90% 55%)",
                        fillColor: "hsl(215 90% 55%)",
                        fillOpacity: 0.25,
                        weight: 2,
                    }}
                />
            )}
            {markers}
        </MapContainer>
    );
});
