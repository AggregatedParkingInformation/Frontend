import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useMap } from "react-leaflet";
import type { Parkplatz } from "@/lib/types";
import { pinIcon } from "./markerIcon";

type Props = {
    parkplaetze: Parkplatz[];
    selectedId: number | null;
    onSelect: (p: Parkplatz) => void;
};

export function ClusteredMarkers({ parkplaetze, selectedId, onSelect }: Props) {
    const map = useMap();
    const groupRef = useRef<L.MarkerClusterGroup | null>(null);
    const markersRef = useRef<Map<number, L.Marker>>(new Map());
    const selectRef = useRef(onSelect);
    const selectedIdRef = useRef(selectedId);
    selectRef.current = onSelect;
    selectedIdRef.current = selectedId;

    // Stable cluster group across renders
    useEffect(() => {
        const group = L.markerClusterGroup({
            chunkedLoading: true,
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 17,
            maxClusterRadius: 60,
        });
        groupRef.current = group;
        map.addLayer(group);
        const markers = markersRef.current;
        return () => {
            map.removeLayer(group);
            groupRef.current = null;
            markers.clear();
        };
    }, [map]);

    // Sync markers with parkplaetze (add/remove only the diff so cluster state is preserved)
    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        const existing = markersRef.current;
        const nextIds = new Set(parkplaetze.map((p) => p.osmId));

        // Remove markers no longer present
        const toRemove: L.Marker[] = [];
        for (const [id, m] of existing) {
            if (!nextIds.has(id)) {
                toRemove.push(m);
                existing.delete(id);
            }
        }
        if (toRemove.length) group.removeLayers(toRemove);

        // Add new markers
        const toAdd: L.Marker[] = [];
        for (const p of parkplaetze) {
            if (!existing.has(p.osmId)) {
                const m = L.marker([p.lat, p.lng], { icon: pinIcon(p, p.osmId === selectedIdRef.current) });
                m.on("click", () => selectRef.current(p));
                existing.set(p.osmId, m);
                toAdd.push(m);
            }
        }
        if (toAdd.length) group.addLayers(toAdd);
    }, [parkplaetze]);

    // Update only the icons of the previously- and newly-selected markers — do not rebuild
    const prevSelectedRef = useRef<number | null>(null);
    useEffect(() => {
        const prev = prevSelectedRef.current;
        prevSelectedRef.current = selectedId;
        const existing = markersRef.current;

        const updateIcon = (id: number | null, active: boolean) => {
            if (id == null) return;
            const m = existing.get(id);
            if (!m) return;
            const p = parkplaetze.find((x) => x.osmId === id);
            if (p) m.setIcon(pinIcon(p, active));
        };

        if (prev !== selectedId) {
            updateIcon(prev, false);
            updateIcon(selectedId, true);
        }
    }, [selectedId, parkplaetze]);

    return null;
}
