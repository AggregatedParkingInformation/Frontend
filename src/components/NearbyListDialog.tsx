import { useMemo, useState } from "react";
import { MapPin, Mountain, Search, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { distanceKm, type LatLng, type ParkingSpace } from "@/lib/types";
import type { FilterState } from "./FilterPanel";

type Props = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    parkingSpaces: ParkingSpace[];
    referenz: LatLng;
    referenzLabel: string;
    selectedId: number | null;
    onSelect: (p: ParkingSpace) => void;
    sortBy?: FilterState["sortBy"];
};

export function NearbyListDialog({
    open,
    onOpenChange,
    parkingSpaces,
    referenz,
    referenzLabel,
    selectedId,
    onSelect,
    sortBy = "distance",
}: Props) {
    const [search, setSearch] = useState("");

    const sorted = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = parkingSpaces
            .filter((p) => {
                if (!term) return true;
                return `${p.name} ${p.region}`.toLowerCase().includes(term);
            })
            .map((p) => ({ p, d: distanceKm(referenz, p) }));
        list.sort((a, b) => {
            if (sortBy === "rating") return b.p.rating - a.p.rating;
            if (sortBy === "name") return a.p.name.localeCompare(b.p.name);
            return a.d - b.d;
        });
        return list.slice(0, 50);
    }, [parkingSpaces, referenz, search, sortBy]);

    const sortLabel = sortBy === "rating" ? "Bewertung" : sortBy === "name" ? "Name" : "Entfernung";

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-5 pb-3 border-b">
                    <DialogTitle className="font-heading">Nächstgelegene Parkplätze</DialogTitle>
                    <DialogDescription>
                        In der Nähe von {referenzLabel} · sortiert nach {sortLabel}
                    </DialogDescription>
                    <div className="relative mt-3">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Parkplatz suchen…"
                            className="pl-9 pr-9 h-10 rounded-full bg-muted/60 border-transparent focus-visible:bg-background"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                aria-label="Suche löschen">
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                </DialogHeader>
                <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden">
                    <div className="p-2">
                        {sorted.length === 0 && (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                {search
                                    ? "Keine Parkplätze gefunden, die zur Suche passen."
                                    : "Keine Parkplätze im aktuellen Kartenausschnitt. Karte verschieben und erneut versuchen."}
                            </div>
                        )}
                        {sorted.map(({ p, d }) => {
                            const active = p.osmId === selectedId;
                            return (
                                <button
                                    key={p.osmId}
                                    onClick={() => {
                                        onSelect(p);
                                        onOpenChange(false);
                                    }}
                                    className={cn(
                                        "w-full text-left flex items-center gap-3 p-3 rounded-xl transition-colors min-w-0 overflow-hidden",
                                        "hover:bg-muted/70",
                                        active && "ring-2 ring-[hsl(var(--brand))] bg-muted/50",
                                    )}>
                                    <div
                                        className={cn(
                                            "size-9 rounded-full grid place-items-center shrink-0 text-white",
                                            p.isHiker ? "bg-[hsl(var(--brand))]" : "bg-[hsl(var(--stone-blue))]",
                                        )}>
                                        {p.isHiker ? <Mountain className="size-4" /> : <MapPin className="size-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-medium truncate min-w-0 flex-1">{p.name}</span>
                                            {p.isHiker && (
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0 text-[10px] py-0 px-1.5">
                                                    Wandern
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground min-w-0">
                                            {p.rating > 0 ? (
                                                <span className="inline-flex items-center gap-1 shrink-0">
                                                    <Star className="size-3 fill-[hsl(var(--rating))] text-[hsl(var(--rating))]" />
                                                    {p.rating.toFixed(1)}
                                                </span>
                                            ) : (
                                                <span className="shrink-0">Keine Bewertung</span>
                                            )}
                                            {p.region && (
                                                <>
                                                    <span className="shrink-0">·</span>
                                                    <span className="truncate min-w-0 flex-1">{p.region}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-1">
                                        <div className="text-sm font-semibold tabular-nums text-[hsl(var(--brand))] whitespace-nowrap">
                                            {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
