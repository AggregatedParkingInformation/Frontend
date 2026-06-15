import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { ParkingSpace, LatLng } from "@/lib/types";
import type { Bbox } from "@/lib/osm";
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, PARKING_LOAD_MIN_ZOOM } from "@/lib/constants";
import { ClusteredMarkers } from "./map/ClusteredMarkers";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function BboxReporter({ onBbox, onZoom }: { onBbox: (b: Bbox | null) => void; onZoom?: (z: number) => void }) {
    const map = useMap();
    const report = () => {
        const zoom = map.getZoom();
        onZoom?.(zoom);
        if (zoom < PARKING_LOAD_MIN_ZOOM) {
            onBbox(null);
            return;
        }
        const b = map.getBounds();
        onBbox({
            south: b.getSouth(),
            west: b.getWest(),
            north: b.getNorth(),
            east: b.getEast(),
        });
    };
    useEffect(() => {
        report();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useMapEvents({ moveend: report, zoomend: report });
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
    parkingSpaces: ParkingSpace[];
    userPos: LatLng | null;
    selectedId: number | null;
    onSelect: (p: ParkingSpace) => void;
    onBboxChange: (b: Bbox | null) => void;
    onZoomChange?: (z: number) => void;
    initialCenter: LatLng;
};

export const Map = forwardRef<MapHandleApi, Props>(function Map(
    { parkingSpaces, userPos, selectedId, onSelect, onBboxChange, onZoomChange, initialCenter },
    ref,
) {
    const handleRef = useRef<MapHandleApi | null>(null);
    useImperativeHandle(ref, () => ({
        flyTo: (lat, lng, zoom) => handleRef.current?.flyTo(lat, lng, zoom),
        getCenter: () => handleRef.current?.getCenter() ?? initialCenter,
    }));

    return (
        <MapContainer
            className="w-screen h-screen z-0"
            center={[initialCenter.lat, initialCenter.lng]}
            zoom={15}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            zoomControl={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapHandle handleRef={handleRef} />
            <BboxReporter
                onBbox={onBboxChange}
                onZoom={onZoomChange}
            />
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
            <ClusteredMarkers
                parkingSpaces={parkingSpaces}
                selectedId={selectedId}
                onSelect={onSelect}
            />
        </MapContainer>
    );
});
