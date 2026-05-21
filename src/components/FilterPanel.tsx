import { Search, Locate, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ParkTyp = "alle" | "wandern" | "standard";

export type FilterState = {
    typ: ParkTyp;
    minSterne: number;
    suche: string;
    sortBy: "distanz" | "bewertung" | "name";
};

// eslint-disable-next-line react-refresh/only-export-components
export const defaultFilter: FilterState = {
    typ: "alle",
    minSterne: 0,
    suche: "",
    sortBy: "distanz",
};

type Props = {
    state: FilterState;
    setState: (s: FilterState) => void;
    onShowNearby: () => void;
    onSearch: () => void;
    resultCount?: number;
};

const TYP_OPTIONS: { value: ParkTyp; label: string }[] = [
    { value: "alle", label: "Alle" },
    { value: "wandern", label: "Wandern" },
    { value: "standard", label: "Standard" },
];

export function FilterPanel({ state, setState, onShowNearby, onSearch, resultCount }: Props) {
    return (
        <div className="flex flex-col gap-5 p-4">
            <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-9 pr-9 h-11 rounded-full bg-muted/60 border-transparent focus-visible:bg-background"
                    placeholder="Ort, Region oder Parkplatz…"
                    value={state.suche}
                    onChange={(e) => setState({ ...state, suche: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                />
                {state.suche && (
                    <button
                        onClick={() => setState({ ...state, suche: "" })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Suche löschen">
                        <X className="size-4" />
                    </button>
                )}
            </div>

            <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                    <SlidersHorizontal className="size-3.5" /> Typ
                </div>
                <div className="inline-flex rounded-full bg-muted p-1 w-full">
                    {TYP_OPTIONS.map((o) => (
                        <button
                            key={o.value}
                            onClick={() => setState({ ...state, typ: o.value })}
                            className={cn(
                                "flex-1 text-sm font-medium rounded-full px-3 py-1.5 transition-colors",
                                state.typ === o.value
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}>
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium text-muted-foreground">Mindest-Bewertung</Label>
                    <span className="text-xs font-semibold tabular-nums">
                        {state.minSterne === 0 ? "Alle" : `${state.minSterne}+ Sterne`}
                    </span>
                </div>
                <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            onClick={() => setState({ ...state, minSterne: n })}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-sm font-medium border transition-colors",
                                state.minSterne === n
                                    ? "bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] border-transparent"
                                    : "bg-background hover:bg-muted border-border",
                            )}>
                            {n === 0 ? "·" : n}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Sortieren nach</Label>
                <Select
                    value={state.sortBy}
                    onValueChange={(v) =>
                        setState({
                            ...state,
                            sortBy: v as FilterState["sortBy"],
                        })
                    }>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="distanz">Entfernung</SelectItem>
                        <SelectItem value="bewertung">Bewertung</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Separator />

            <Button
                variant="secondary"
                onClick={onShowNearby}
                className="w-full h-11 rounded-full">
                <Locate /> Nächstgelegene anzeigen
            </Button>

            {resultCount != null && (
                <div className="text-xs text-muted-foreground text-center -mt-1">
                    {resultCount} Parkplätze in der Kartenansicht
                </div>
            )}
        </div>
    );
}
