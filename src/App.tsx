import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Locate, Menu, User, ZoomIn } from "lucide-react";
import { AdminPanel } from "@/components/AdminPanel";
import { Map as MapView, type MapHandleApi } from "@/components/Map";
import { FilterPanel, defaultFilter, type AdvancedFilter, type FilterState } from "@/components/FilterPanel";
import { ParkingSpaceDetail } from "@/components/ParkingSpaceDetail";
import { NearbyListDialog } from "@/components/NearbyListDialog";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "sonner";
import { useOsmParkplaetze, useParkingSpacesBulk } from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores/authStore";
import { distanceKm, type LatLng, type ParkingSpace } from "@/lib/types";
import type { Bbox } from "@/lib/osm";
import { BBOX_DEBOUNCE_MS, INITIAL_CENTER, PARKING_LOAD_MIN_ZOOM } from "@/lib/constants";
import { debounce } from "@/lib/debounce";
import { mergeParkingSpaces } from "@/lib/parkingSpaceMerge";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { ThemeToggle } from "./components/ToggleTheme";

export default function App() {
    const mapRef = useRef<MapHandleApi>(null);
    const [filter, setFilter] = useState<FilterState>(defaultFilter);
    const [selected, setSelected] = useState<ParkingSpace | null>(null);
    const [bbox, setBbox] = useState<Bbox | null>(null);
    const [mapCenter, setMapCenter] = useState<LatLng>(INITIAL_CENTER);
    const [zoom, setZoom] = useState<number>(15);
    const [nearbyOpen, setNearbyOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [adminPanelOpen, setAdminPanelOpen] = useState(false);
    const isMobile = useIsMobile();
    const { pos: userPos, locate } = useGeolocation();

    const user = useAuthStore((s) => s.user);
    const loadAuth = useAuthStore((s) => s.loadOnce);
    useEffect(() => {
        void loadAuth();
    }, [loadAuth]);

    const onBboxChange = useMemo(
        () =>
            debounce((b: Bbox | null) => {
                setBbox(b);
                if (b) {
                    setMapCenter({
                        lat: (b.north + b.south) / 2,
                        lng: (b.east + b.west) / 2,
                    });
                }
            }, BBOX_DEBOUNCE_MS),
        [],
    );

    const osmQ = useOsmParkplaetze(bbox);
    const osmIds = useMemo(() => (osmQ.data ?? []).map((p) => p.osmId), [osmQ.data]);
    const backendQ = useParkingSpacesBulk(osmIds);

    const parkingSpaces = useMemo(() => mergeParkingSpaces(osmQ.data ?? [], backendQ.data), [osmQ.data, backendQ.data]);

    const referenz: LatLng = userPos ?? mapCenter;

    const filtered = useMemo(() => {
        const term = filter.search.trim().toLowerCase();
        const list = parkingSpaces.filter((p) => {
            if (filter.category === "hiking" && !p.isHiker) return false;
            if (filter.category === "standard" && p.isHiker) return false;
            if (filter.minStars > 0) {
                if (!p.reviewCount || p.rating < filter.minStars) return false;
            }
            if (term && !`${p.name} ${p.region}`.toLowerCase().includes(term)) return false;
            if (!matchesAdvanced(p.tags, filter.advanced)) return false;
            if (filter.advanced.maxDistance > 0) {
                if (distanceKm(referenz, p) > filter.advanced.maxDistance) return false;
            }
            return true;
        });
        list.sort((a, b) => {
            if (filter.sortBy === "rating") return b.rating - a.rating;
            if (filter.sortBy === "name") return a.name.localeCompare(b.name);
            return distanceKm(referenz, a) - distanceKm(referenz, b);
        });
        return list;
    }, [filter, parkingSpaces, referenz]);

    const handleMapSelect = useCallback((p: ParkingSpace) => {
        setSelected(p);
        setMobileFilterOpen(false);
    }, []);

    const handleListSelect = useCallback((p: ParkingSpace) => {
        setSelected(p);
        mapRef.current?.flyTo(p.lat, p.lng);
        setMobileFilterOpen(false);
    }, []);

    const handlePlaceSelect = useCallback((p: { lat: number; lng: number }) => {
        mapRef.current?.flyTo(p.lat, p.lng, 14);
    }, []);

    const handleLocateMe = () => {
        if (userPos) {
            mapRef.current?.flyTo(userPos.lat, userPos.lng, 14);
        } else {
            locate((p) => mapRef.current?.flyTo(p.lat, p.lng, 14));
        }
    };

    const loading = osmQ.isFetching;
    const zoomTooFarOut = zoom < PARKING_LOAD_MIN_ZOOM;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-background">
            <MapView
                ref={mapRef}
                parkingSpaces={filtered}
                userPos={userPos}
                selectedId={selected?.osmId ?? null}
                onSelect={handleMapSelect}
                onBboxChange={onBboxChange}
                onZoomChange={setZoom}
                initialCenter={INITIAL_CENTER}
            />

            {zoomTooFarOut && (
                <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900]">
                    <div className="flex items-center gap-2 rounded-full bg-background/95 backdrop-blur px-4 py-2 shadow-[var(--shadow-elevated)] border text-sm">
                        <ZoomIn className="size-4 text-muted-foreground" />
                        <span>Hineinzoomen, um Parkplätze zu laden</span>
                    </div>
                </div>
            )}

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
                    {zoomTooFarOut ? (
                        <>
                            <ZoomIn className="size-3" /> Zoom {zoom} – ab Stufe {PARKING_LOAD_MIN_ZOOM} werden
                            Parkplätze geladen
                        </>
                    ) : loading ? (
                        <>
                            <Loader2 className="size-3 animate-spin" /> Lade Daten…
                        </>
                    ) : (
                        <>Daten wurden geladen</>
                    )}

                    <ThemeToggle className="ml-auto" />
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

                        <div className="flex justify-center mt-auto mb-2">
                            <ThemeToggle className="  text-center " />
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="flex-1 px-4 h-12 rounded-2xl bg-background shadow-lg border flex items-center text-sm">
                    <span className="font-heading font-semibold truncate">
                        {zoomTooFarOut ? "Hineinzoomen…" : loading ? "Lade…" : `${filtered.length} Parkplätze`}
                    </span>
                </div>
            </div>

            {/* Desktop detail panel */}
            {selected && !isMobile && (
                <aside className="hidden md:flex fixed top-4 right-4 bottom-4 z-[1000] w-[26rem] flex-col rounded-2xl border bg-background/95 backdrop-blur shadow-[var(--shadow-elevated)] overflow-hidden">
                    <ParkingSpaceDetail
                        parkingSpace={selected}
                        userPos={userPos}
                        onClose={() => setSelected(null)}
                        canInteract={!!user}
                        onRequireLogin={() => setAuthOpen(true)}
                    />
                </aside>
            )}

            {isMobile && (
                <Sheet
                    open={!!selected}
                    onOpenChange={(b) => !b && setSelected(null)}>
                    <SheetContent
                        side="bottom"
                        className="p-0 max-h-[85vh] rounded-t-3xl">
                        {selected && (
                            <ParkingSpaceDetail
                                parkingSpace={selected}
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
            <div className="fixed bottom-5 right-5 flex flex-col gap-2">
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
                parkingSpaces={parkingSpaces}
                referenz={referenz}
                referenzLabel={userPos ? "deinem Standort" : "der Kartenmitte"}
                selectedId={selected?.osmId ?? null}
                onSelect={handleListSelect}
                sortBy={filter.sortBy}
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

const PAVED = new Set([
    "paved",
    "asphalt",
    "concrete",
    "concrete:plates",
    "concrete:lanes",
    "paving_stones",
    "sett",
    "cobblestone",
    "compacted",
    "metal",
]);
const UNPAVED = new Set([
    "unpaved",
    "gravel",
    "fine_gravel",
    "ground",
    "dirt",
    "earth",
    "grass",
    "sand",
    "mud",
    "pebblestone",
    "wood",
]);

function matchesAdvanced(tags: Record<string, string>, a: AdvancedFilter): boolean {
    if (a.fee !== "all") {
        const hasFee = !["no", "unknown", "donation", undefined, null].includes(tags?.fee);
        if (a.fee === "free" && hasFee) return false;
        if (a.fee === "paid" && !hasFee) return false;
    }
    if (a.lit === "yes" && tags.lit !== "yes") return false;
    if (a.covered === "yes" && tags.covered !== "yes") return false;
    if (a.surface !== "all") {
        const s = tags.surface;
        if (!s) return false;
        if (a.surface === "paved" && !PAVED.has(s)) return false;
        if (a.surface === "unpaved" && !UNPAVED.has(s)) return false;
    }
    if (a.access !== "all") {
        const ac = tags.access ?? "";
        if (a.access === "public" && !(ac === "" || ac === "yes" || ac === "permissive" || ac === "public"))
            return false;
        if (a.access === "customers" && ac !== "customers") return false;
        if (a.access === "private" && !(ac === "private" || ac === "no")) return false;
    }
    if (a.disabled === "yes") {
        const cd = tags["capacity:disabled"];
        if (!cd || cd === "no" || cd === "0") return false;
    }
    if (a.parkingType !== "all") {
        const pt = tags.parking ?? "";
        if (a.parkingType === "underground" && pt !== "underground") return false;
        if (a.parkingType === "garage" && !(pt === "multi-storey" || pt === "multi_storey" || pt === "rooftop"))
            return false;
        if (
            a.parkingType === "surface" &&
            !(pt === "" || pt === "surface" || pt === "street_side" || pt === "lane" || pt === "layby")
        )
            return false;
    }
    if (a.minCapacity > 0) {
        const cap = Number(tags.capacity);
        if (!Number.isFinite(cap) || cap < a.minCapacity) return false;
    }
    if (a.charging === "yes") {
        const cc = tags["capacity:charging"];
        const ccNum = Number(cc);
        if (!(tags.charging === "yes" || tags.amenity === "charging_station" || (Number.isFinite(ccNum) && ccNum > 0)))
            return false;
    }
    if (a.toilets === "yes" && !(tags.toilets === "yes" || tags["toilets:access"])) return false;
    if (a.rvFriendly === "yes" && !(tags.caravans === "yes" || tags.motorhome === "yes" || tags["caravan"] === "yes"))
        return false;
    if (a.truckFriendly === "yes" && !(tags.hgv === "yes" || tags.truck === "yes")) return false;
    if (a.security === "camera" && !(tags.surveillance === "camera" || tags["surveillance:type"] === "camera"))
        return false;
    if (a.security === "guarded" && tags.supervised !== "yes") return false;
    if (a.maxStay !== "all") {
        const ms = tags.maxstay;
        if (!ms) return false;
        const hours = parseMaxStayHours(ms);
        const need = Number(a.maxStay.replace("h", ""));
        if (!Number.isFinite(hours) || hours < need) return false;
    }
    if (
        a.evOnly === "yes" &&
        !(
            tags["access:electric_vehicle"] === "only" ||
            tags["motor_vehicle:electric"] === "only" ||
            tags.ev_only === "yes"
        )
    )
        return false;
    if (
        a.parkAndRide === "yes" &&
        !(tags["park_ride"] === "yes" || tags.park_ride === "bus" || tags.park_ride === "train")
    )
        return false;
    return true;
}

function parseMaxStayHours(s: string): number {
    const v = s.trim().toLowerCase();
    if (v === "unlimited" || v === "no") return Infinity;
    const m = v.match(/^(\d+(?:\.\d+)?)\s*(min|minutes?|h|hours?|d|days?)?$/);
    if (!m) return NaN;
    const num = Number(m[1]);
    const unit = m[2] ?? "h";
    if (unit.startsWith("min")) return num / 60;
    if (unit.startsWith("d")) return num * 24;
    return num;
}
