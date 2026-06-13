import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Locate, Menu, User } from "lucide-react";
import { AdminPanel } from "@/components/AdminPanel";
import { Map as MapView, type MapHandleApi } from "@/components/Map";
import { FilterPanel, defaultFilter, type FilterState } from "@/components/FilterPanel";
import { ParkplatzDetail } from "@/components/ParkplatzDetail";
import { NearbyListDialog } from "@/components/NearbyListDialog";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "sonner";
import { useAverageStars, useOsmParkplaetze, useParkingSpaces } from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores/authStore";
import { distanzKm, type LatLng, type Parkplatz } from "@/lib/types";
import type { Bbox } from "@/lib/osm";

const INITIAL_CENTER: LatLng = { lat: 49.9929, lng: 8.2473 };

function debounce<F extends (...a: never[]) => void>(fn: F, ms: number) {
    let t: ReturnType<typeof setTimeout>;
    return ((...a: Parameters<F>) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
    }) as F;
}

function useIsMobile() {
    const [m, setM] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
    );
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const h = (e: MediaQueryListEvent) => setM(e.matches);
        mq.addEventListener("change", h);
        return () => mq.removeEventListener("change", h);
    }, []);
    return m;
}

export default function App() {
    const mapRef = useRef<MapHandleApi>(null);
    const [filter, setFilter] = useState<FilterState>(defaultFilter);
    const [selected, setSelected] = useState<Parkplatz | null>(null);
    const [bbox, setBbox] = useState<Bbox | null>(null);
    const [userPos, setUserPos] = useState<LatLng | null>(null);
    const [mapCenter, setMapCenter] = useState<LatLng>(INITIAL_CENTER);
    const [nearbyOpen, setNearbyOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [adminPanelOpen, setAdminPanelOpen] = useState(false);
    const isMobile = useIsMobile();

    // Load auth once (zustand store)
    const user = useAuthStore((s) => s.user);
    const loadAuth = useAuthStore((s) => s.loadOnce);
    useEffect(() => {
        void loadAuth();
    }, [loadAuth]);

    const setBboxDebounced = useMemo(
        () =>
            debounce((b: Bbox) => {
                setBbox(b);
                setMapCenter({
                    lat: (b.north + b.south) / 2,
                    lng: (b.east + b.west) / 2,
                });
            }, 400),
        [],
    );

    const osmQ = useOsmParkplaetze(bbox);
    const backendQ = useParkingSpaces();

    // Geolocation
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) =>
                setUserPos({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }),
            () => {
                /* permission denied, fallback to map center */
            },
            { enableHighAccuracy: false, timeout: 5000 },
        );
    }, []);

    const avgMap = useAverageStars(backendQ.data);

    // Merge OSM + backend aggregates + averages
    const parkplaetze = useMemo<Parkplatz[]>(() => {
        const list = osmQ.data ?? [];
        const aggMap = new Map<number, { reviews: number; comments: number }>();
        for (const a of backendQ.data ?? [])
            aggMap.set(a.osmId, {
                reviews: a.reviews,
                comments: a.comments,
            });
        return list.map((p) => {
            const a = aggMap.get(p.osmId);
            const avg = avgMap.get(p.osmId);
            if (!a && !avg) return p;
            return {
                ...p,
                anzahlBewertungen: avg?.count ?? a?.reviews ?? 0,
                anzahlKommentare: a?.comments ?? 0,
                bewertung: avg?.avg ?? 0,
            };
        });
    }, [osmQ.data, backendQ.data, avgMap]);

    const referenz: LatLng = userPos ?? mapCenter;

    const filtered = useMemo(() => {
        const term = filter.suche.trim().toLowerCase();
        const list = parkplaetze.filter((p) => {
            if (filter.typ === "wandern" && !p.istWanderparkplatz) return false;
            if (filter.typ === "standard" && p.istWanderparkplatz) return false;
            if (filter.minSterne > 0) {
                // require a real rating from backend
                if (!p.anzahlBewertungen || p.bewertung < filter.minSterne) return false;
            }
            if (term && !`${p.name} ${p.region}`.toLowerCase().includes(term)) return false;
            return true;
        });
        list.sort((a, b) => {
            if (filter.sortBy === "bewertung") return b.bewertung - a.bewertung;
            if (filter.sortBy === "name") return a.name.localeCompare(b.name);
            return distanzKm(referenz, a) - distanzKm(referenz, b);
        });
        return list;
    }, [filter, parkplaetze, referenz]);

    const handleSelect = (p: Parkplatz) => {
        setSelected(p);
        mapRef.current?.flyTo(p.lat, p.lng);
        setMobileFilterOpen(false);
    };

    const handlePlaceSelect = (p: { lat: number; lng: number }) => {
        mapRef.current?.flyTo(p.lat, p.lng, 14);
    };

    const handleLocateMe = () => {
        if (userPos) {
            mapRef.current?.flyTo(userPos.lat, userPos.lng, 14);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const p = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    };
                    setUserPos(p);
                    mapRef.current?.flyTo(p.lat, p.lng, 14);
                },
                () => {},
            );
        }
    };

    const loading = osmQ.isFetching;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-background">
            <MapView
                ref={mapRef}
                parkplaetze={filtered}
                userPos={userPos}
                selectedId={selected?.osmId ?? null}
                onSelect={handleSelect}
                onBboxChange={setBboxDebounced}
                initialCenter={INITIAL_CENTER}
            />

            {/* Desktop sidebar */}
            <aside className="hidden md:flex fixed top-4 left-4 bottom-4 z-[1000] w-80 flex-col rounded-2xl border bg-background/95 backdrop-blur shadow-[var(--shadow-elevated)] overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b">
                    <h1 className="font-heading text-xl font-bold flex items-center gap-2">
                        <span className="inline-grid place-items-center size-7 rounded-xl bg-[hsl(var(--brand))] text-white text-xs font-black">
                            W
                        </span>
                        Wanderpark
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Parkplätze für deine nächste Tour</p>
                </div>
                <div className="overflow-y-auto flex-1">
                    <FilterPanel
                        state={filter}
                        setState={setFilter}
                        onShowNearby={() => setNearbyOpen(true)}
                        onSearch={() => {}}
                        onPlaceSelect={handlePlaceSelect}
                        resultCount={filtered.length}
                    />
                </div>
                <div className="px-4 py-2.5 text-[11px] text-muted-foreground border-t flex items-center gap-2">
                    {loading ? (
                        <>
                            <Loader2 className="size-3 animate-spin" /> Lade OpenStreetMap…
                        </>
                    ) : (
                        <>Daten via OpenStreetMap</>
                    )}
                </div>
            </aside>

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-3 left-3 right-3 z-[1000] flex items-center gap-2">
                <Sheet
                    open={mobileFilterOpen}
                    onOpenChange={setMobileFilterOpen}>
                    <SheetTrigger asChild>
                        <Button
                            size="icon-lg"
                            variant="secondary"
                            className="shadow-lg bg-background h-12 w-12 rounded-2xl">
                            <Menu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="p-0 w-[88vw] sm:w-80">
                        <div className="p-5 border-b">
                            <h1 className="font-heading text-xl font-bold">Wanderpark</h1>
                        </div>
                        <FilterPanel
                            state={filter}
                            setState={setFilter}
                            onShowNearby={() => {
                                setNearbyOpen(true);
                                setMobileFilterOpen(false);
                            }}
                            onSearch={() => setMobileFilterOpen(false)}
                            onPlaceSelect={(p) => {
                                handlePlaceSelect(p);
                                setMobileFilterOpen(false);
                            }}
                            resultCount={filtered.length}
                        />
                    </SheetContent>
                </Sheet>
                <div className="flex-1 px-4 h-12 rounded-2xl bg-background shadow-lg border flex items-center text-sm">
                    <span className="font-heading font-semibold truncate">
                        {loading ? "Lade…" : `${filtered.length} Parkplätze`}
                    </span>
                </div>
            </div>

            {/* Desktop detail panel */}
            {selected && !isMobile && (
                <aside className="hidden md:flex fixed top-4 right-4 bottom-4 z-[1000] w-[26rem] flex-col rounded-2xl border bg-background/95 backdrop-blur shadow-[var(--shadow-elevated)] overflow-hidden">
                    <ParkplatzDetail
                        parkplatz={selected}
                        userPos={userPos}
                        onClose={() => setSelected(null)}
                        canInteract={!!user}
                        onRequireLogin={() => setAuthOpen(true)}
                    />
                </aside>
            )}

            {/* Mobile detail bottom-sheet — only mount on mobile so the overlay doesn't block desktop clicks */}
            {isMobile && (
                <Sheet
                    open={!!selected}
                    onOpenChange={(b) => !b && setSelected(null)}>
                    <SheetContent
                        side="bottom"
                        className="p-0 max-h-[85vh] rounded-t-3xl">
                        {selected && (
                            <ParkplatzDetail
                                parkplatz={selected}
                                userPos={userPos}
                                onClose={() => setSelected(null)}
                                canInteract={!!user}
                                onRequireLogin={() => setAuthOpen(true)}
                                inSheet
                            />
                        )}
                    </SheetContent>
                </Sheet>
            )}

            {/* Floating action buttons */}
            <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2">
                <Button
                    size="icon-lg"
                    variant="secondary"
                    onClick={handleLocateMe}
                    className="ml-auto shadow-lg bg-background h-12 w-12 rounded-2xl"
                    aria-label="Mein Standort">
                    <Locate />
                </Button>
                <Button
                    onClick={() => setProfileOpen(true)}
                    className="shadow-lg h-12 rounded-2xl"
                    size="lg">
                    <User /> Profil
                </Button>
            </div>

            <ProfileSheet
                open={profileOpen}
                onOpenChange={setProfileOpen}
                initialAuthOpen={authOpen}
                onAuthOpenChange={setAuthOpen}
            />

            <NearbyListDialog
                open={nearbyOpen}
                onOpenChange={setNearbyOpen}
                parkplaetze={parkplaetze}
                referenz={referenz}
                referenzLabel={userPos ? "deinem Standort" : "der Kartenmitte"}
                selectedId={selected?.osmId ?? null}
                onSelect={handleSelect}
            />
            <AdminPanel
                open={adminPanelOpen}
                onOpenChange={setAdminPanelOpen}
            />

            <Toaster
                position="top-center"
                richColors
            />
        </div>
    );
}
