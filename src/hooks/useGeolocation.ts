import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "@/lib/types";

type Options = { auto?: boolean };

export function useGeolocation({ auto = true }: Options = {}) {
    const [pos, setPos] = useState<LatLng | null>(null);

    const locate = useCallback((onSuccess?: (p: LatLng) => void) => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (g) => {
                const p = { lat: g.coords.latitude, lng: g.coords.longitude };
                setPos(p);
                onSuccess?.(p);
            },
            () => {
                /* permission denied / timeout — ignore */
            },
            { enableHighAccuracy: false, timeout: 5000 },
        );
    }, []);

    useEffect(() => {
        if (auto) locate();
    }, [auto, locate]);

    return { pos, locate } as const;
}
