import { MapPin, Mountain, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { distanzKm, type LatLng, type Parkplatz } from "@/lib/types";

type Props = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    parkplaetze: Parkplatz[];
    referenz: LatLng;
    referenzLabel: string;
    selectedId: number | null;
    onSelect: (p: Parkplatz) => void;
};

export function NearbyListDialog({
    open,
    onOpenChange,
    parkplaetze,
    referenz,
    referenzLabel,
    selectedId,
    onSelect,
}: Props) {
    const sorted = [...parkplaetze]
        .map((p) => ({ p, d: distanzKm(referenz, p) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 30);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-5 pb-3 border-b">
                    <DialogTitle className="font-heading">Nächstgelegene Parkplätze</DialogTitle>
                    <DialogDescription>In der Nähe von {referenzLabel}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh]">
                    <div className="p-2">
                        {sorted.length === 0 && (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Keine Parkplätze im aktuellen Kartenausschnitt. Karte verschieben und erneut versuchen.
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
                                        "w-full text-left flex items-center gap-3 p-3 rounded-xl transition-colors",
                                        "hover:bg-muted/70",
                                        active && "ring-2 ring-[hsl(var(--brand))] bg-muted/50",
                                    )}>
                                    <div
                                        className={cn(
                                            "size-9 rounded-full grid place-items-center shrink-0 text-white",
                                            p.istWanderparkplatz
                                                ? "bg-[hsl(var(--brand))]"
                                                : "bg-[hsl(var(--stone-blue))]",
                                        )}>
                                        {p.istWanderparkplatz ? (
                                            <Mountain className="size-4" />
                                        ) : (
                                            <MapPin className="size-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{p.name}</span>
                                            {p.istWanderparkplatz && (
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0 text-[10px] py-0 px-1.5">
                                                    Wandern
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                            {p.bewertung > 0 ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Star className="size-3 fill-[hsl(var(--rating))] text-[hsl(var(--rating))]" />
                                                    {p.bewertung.toFixed(1)}
                                                </span>
                                            ) : (
                                                <span>Keine Bewertung</span>
                                            )}
                                            {p.region && (
                                                <>
                                                    <span>·</span>
                                                    <span className="truncate">{p.region}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-semibold tabular-nums text-[hsl(var(--brand))]">
                                            {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
