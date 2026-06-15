import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Locate,
    SlidersHorizontal,
    X,
    MapPin,
    Loader2,
    Filter,
    Star,
    ArrowUpDown,
    Mountain,
    Accessibility,
    Euro,
    Lightbulb,
    Umbrella,
    Layers,
    KeyRound,
    Users,
    Zap,
    Bath,
    Caravan,
    Truck,
    ShieldCheck,
    Timer,
    BatteryCharging,
    Train,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePlaceSuggestions } from "@/lib/hooks";
import type { PlaceSuggestion } from "@/lib/geocode";

export type ParkingCategory = "all" | "hiking" | "standard";

export type AdvancedFilter = {
    fee: "all" | "free" | "paid";
    lit: "all" | "yes";
    covered: "all" | "yes";
    surface: "all" | "paved" | "unpaved";
    access: "all" | "public" | "customers" | "private";
    disabled: "all" | "yes";
    parkingType: "all" | "surface" | "underground" | "garage";
    minCapacity: number;
    charging: "all" | "yes";
    toilets: "all" | "yes";
    rvFriendly: "all" | "yes";
    truckFriendly: "all" | "yes";
    security: "all" | "camera" | "guarded";
    maxStay: "all" | "1h" | "2h" | "4h" | "8h" | "24h";
    evOnly: "all" | "yes";
    parkAndRide: "all" | "yes";
    maxDistance: number;
};

// eslint-disable-next-line react-refresh/only-export-components
export const defaultAdvanced: AdvancedFilter = {
    fee: "all",
    lit: "all",
    covered: "all",
    surface: "all",
    access: "all",
    disabled: "all",
    parkingType: "all",
    minCapacity: 0,
    charging: "all",
    toilets: "all",
    rvFriendly: "all",
    truckFriendly: "all",
    security: "all",
    maxStay: "all",
    evOnly: "all",
    parkAndRide: "all",
    maxDistance: 0,
};

export type FilterState = {
    category: ParkingCategory;
    minStars: number;
    search: string;
    sortBy: "distance" | "rating" | "name";
    advanced: AdvancedFilter;
};

// eslint-disable-next-line react-refresh/only-export-components
export const defaultFilter: FilterState = {
    category: "all",
    minStars: 0,
    search: "",
    sortBy: "distance",
    advanced: { ...defaultAdvanced },
};

// eslint-disable-next-line react-refresh/only-export-components
export function countActiveAdvanced(a: AdvancedFilter): number {
    return Object.entries(a).reduce((n, [k, v]) => {
        if (k === "minCapacity" || k === "maxDistance") return n + ((v as number) > 0 ? 1 : 0);
        return n + (v !== "all" ? 1 : 0);
    }, 0);
}

type Props = {
    state: FilterState;
    setState: (s: FilterState) => void;
    onShowNearby: () => void;
    onSearch: () => void;
    onPlaceSelect?: (p: PlaceSuggestion) => void;
    resultCount?: number;
};

const TYP_OPTIONS: { value: ParkingCategory; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "hiking", label: "Wandern" },
    { value: "standard", label: "Standard" },
];

export function FilterPanel({ state, setState, onShowNearby, onSearch, onPlaceSelect, resultCount }: Props) {
    const [debounced, setDebounced] = useState(state.search);
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const advancedCount = useMemo(() => countActiveAdvanced(state.advanced), [state.advanced]);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(state.search), 300);
        return () => clearTimeout(t);
    }, [state.search]);
    const suggestQ = usePlaceSuggestions(suggestOpen ? debounced : "");
    const suggestions = suggestQ.data ?? [];

    const pickSuggestion = (p: PlaceSuggestion) => {
        setSuggestOpen(false);
        setState({ ...state, search: "" }); //clear search input
        onPlaceSelect?.(p);
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-9 pr-9 h-11 rounded-full bg-muted/60 border-transparent focus-visible:bg-background"
                    placeholder="Ort, Region oder Parkplatz…"
                    value={state.search}
                    onChange={(e) => {
                        setState({ ...state, search: e.target.value });
                        setSuggestOpen(true);
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (suggestions[0]) {
                                pickSuggestion(suggestions[0]);
                            } else {
                                onSearch();
                            }
                        }
                        if (e.key === "Escape") setSuggestOpen(false);
                    }}
                />
                {state.search && (
                    <button
                        onClick={() => {
                            setState({ ...state, search: "" });
                            setSuggestOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Suche löschen">
                        <X className="size-4" />
                    </button>
                )}
                {suggestOpen && debounced.trim().length >= 2 && (
                    <div className="absolute z-[1050] mt-1.5 left-0 right-0 rounded-xl border bg-popover shadow-lg overflow-hidden">
                        {suggestQ.isFetching && (
                            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" /> Suche Orte…
                            </div>
                        )}
                        {!suggestQ.isFetching && suggestions.length === 0 && (
                            <div className="px-3 py-2.5 text-xs text-muted-foreground">Keine Orte gefunden</div>
                        )}
                        {suggestions.map((p) => (
                            <button
                                key={p.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickSuggestion(p)}
                                className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2 text-sm border-b last:border-b-0">
                                <MapPin className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{p.label.split(",")[0]}</div>
                                    <div className="truncate text-[11px] text-muted-foreground">{p.label}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Section
                icon={<SlidersHorizontal className="size-3.5" />}
                title="Typ">
                <div className="inline-flex rounded-full bg-muted p-1 w-full">
                    {TYP_OPTIONS.map((o) => (
                        <button
                            key={o.value}
                            onClick={() => setState({ ...state, category: o.value })}
                            className={cn(
                                "flex-1 text-sm font-medium rounded-full px-3 py-1.5 transition-colors flex items-center justify-center gap-1.5",
                                state.category === o.value
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}>
                            {o.value === "hiking" && <Mountain className="size-3.5" />}
                            {o.label}
                        </button>
                    ))}
                </div>
            </Section>

            <Section
                icon={<Star className="size-3.5" />}
                title="Mindest-Bewertung"
                trailing={
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                        {state.minStars === 0 ? "Alle" : `${state.minStars}+`}
                    </span>
                }>
                <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            onClick={() => setState({ ...state, minStars: n })}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-sm font-medium border transition-colors",
                                state.minStars === n
                                    ? "bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] border-transparent shadow-sm"
                                    : "bg-background hover:bg-muted border-border",
                            )}>
                            {n === 0 ? "·" : n}
                        </button>
                    ))}
                </div>
            </Section>

            <Section
                icon={<ArrowUpDown className="size-3.5" />}
                title="Sortieren nach">
                <Select
                    value={state.sortBy}
                    onValueChange={(v) =>
                        setState({
                            ...state,
                            sortBy: v as FilterState["sortBy"],
                        })
                    }>
                    <SelectTrigger className="w-full h-10 rounded-lg">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="distance">Entfernung</SelectItem>
                        <SelectItem value="rating">Bewertung</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                </Select>
            </Section>

            <Separator />

            <div className="flex flex-col gap-2">
                <Button
                    variant="secondary"
                    onClick={onShowNearby}
                    className="h-11 rounded-xl w-full">
                    <Locate /> Nächste Parkplätze
                </Button>
                <Button
                    variant={advancedCount > 0 ? "default" : "outline"}
                    onClick={() => setAdvancedOpen(true)}
                    className="h-11 rounded-xl w-full">
                    <Filter /> Filter
                    {advancedCount > 0 && (
                        <Badge
                            variant="secondary"
                            className="ml-1.5 h-5 px-1.5 bg-background/20 text-current">
                            {advancedCount}
                        </Badge>
                    )}
                </Button>
            </div>

            {advancedCount > 0 && (
                <button
                    onClick={() => setState({ ...state, advanced: { ...defaultAdvanced } })}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1 -mt-1">
                    <X className="size-3" /> Erweiterte Filter zurücksetzen
                </button>
            )}

            {resultCount != null && (
                <div className="text-xs text-muted-foreground text-center">
                    {resultCount} Parkplätze in der Kartenansicht
                </div>
            )}

            <AdvancedFilterDialog
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
                value={state.advanced}
                onChange={(adv) => setState({ ...state, advanced: adv })}
            />
        </div>
    );
}

function Section({
    icon,
    title,
    trailing,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    trailing?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {icon}
                    {title}
                </div>
                {trailing}
            </div>
            {children}
        </div>
    );
}

type AdvancedDialogProps = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    value: AdvancedFilter;
    onChange: (a: AdvancedFilter) => void;
};

function AdvancedFilterDialog({ open, onOpenChange, value, onChange }: AdvancedDialogProps) {
    const set = <K extends keyof AdvancedFilter>(k: K, v: AdvancedFilter[K]) => onChange({ ...value, [k]: v });
    const activeCount = countActiveAdvanced(value);
    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-5 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Filter className="size-4" /> Erweiterte Filter
                        {activeCount > 0 && (
                            <Badge className="bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand))]">
                                {activeCount} aktiv
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>Verfeinere die Ergebnisse nach Tags und Eigenschaften</DialogDescription>
                </DialogHeader>
                <div className="p-5 grid sm:grid-cols-3 gap-2 max-h-[65vh] overflow-y-auto">
                    <div className="col-span-full">
                        <div className="flex gap-2">
                            <div className="w-full">
                                <AdvField
                                    icon={<Locate className="size-3.5" />}
                                    label="Max. Entfernung"
                                    trailing={
                                        <span className="text-xs font-semibold tabular-nums">
                                            {value.maxDistance === 0 ? "Alle" : `≤ ${value.maxDistance} km`}
                                        </span>
                                    }>
                                    <Slider
                                        value={[value.maxDistance]}
                                        onValueChange={(vals: number[]) => set("maxDistance", vals[0])}
                                        min={0}
                                        max={100}
                                        step={1}
                                    />
                                </AdvField>
                            </div>
                            <div className="w-full">
                                <AdvField
                                    icon={<Users className="size-3.5" />}
                                    label="Mindestkapazität"
                                    trailing={
                                        <span className="text-xs font-semibold tabular-nums">
                                            {value.minCapacity === 0 ? "Alle" : `${value.minCapacity}+`}
                                        </span>
                                    }>
                                    <Slider
                                        value={[value.minCapacity]}
                                        onValueChange={(vals: number[]) => set("minCapacity", vals[0])}
                                        min={0}
                                        max={100}
                                        step={5}
                                    />
                                </AdvField>
                            </div>
                        </div>
                    </div>
                    <AdvField
                        icon={<Euro className="size-3.5" />}
                        label="Gebühr">
                        <Select
                            value={value.fee}
                            onValueChange={(v) => set("fee", v as AdvancedFilter["fee"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="free">Kostenlos</SelectItem>
                                <SelectItem value="paid">Kostenpflichtig</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<KeyRound className="size-3.5" />}
                        label="Zugang">
                        <Select
                            value={value.access}
                            onValueChange={(v) => set("access", v as AdvancedFilter["access"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="public">Öffentlich</SelectItem>
                                <SelectItem value="customers">Kunden</SelectItem>
                                <SelectItem value="private">Privat</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<Layers className="size-3.5" />}
                        label="Oberfläche">
                        <Select
                            value={value.surface}
                            onValueChange={(v) => set("surface", v as AdvancedFilter["surface"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="paved">Befestigt</SelectItem>
                                <SelectItem value="unpaved">Unbefestigt</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<MapPin className="size-3.5" />}
                        label="Parkplatzart">
                        <Select
                            value={value.parkingType}
                            onValueChange={(v) => set("parkingType", v as AdvancedFilter["parkingType"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="surface">Oberirdisch</SelectItem>
                                <SelectItem value="underground">Tiefgarage</SelectItem>
                                <SelectItem value="garage">Parkhaus</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<Lightbulb className="size-3.5" />}
                        label="Beleuchtung">
                        <Select
                            value={value.lit}
                            onValueChange={(v) => set("lit", v as AdvancedFilter["lit"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="yes">Beleuchtet</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<Umbrella className="size-3.5" />}
                        label="Überdachung">
                        <Select
                            value={value.covered}
                            onValueChange={(v) => set("covered", v as AdvancedFilter["covered"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="yes">Überdacht</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<Accessibility className="size-3.5" />}
                        label="Behindertenparkplatz">
                        <Select
                            value={value.disabled}
                            onValueChange={(v) => set("disabled", v as AdvancedFilter["disabled"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="yes">Vorhanden</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <YesNoField
                        icon={<Zap className="size-3.5" />}
                        label="Ladesäule"
                        k="charging"
                        value={value}
                        set={set}
                    />
                    <YesNoField
                        icon={<Bath className="size-3.5" />}
                        label="Toiletten"
                        k="toilets"
                        value={value}
                        set={set}
                    />
                    <YesNoField
                        icon={<Caravan className="size-3.5" />}
                        label="Wohnmobil-tauglich"
                        k="rvFriendly"
                        value={value}
                        set={set}
                    />
                    <YesNoField
                        icon={<Truck className="size-3.5" />}
                        label="LKW-tauglich"
                        k="truckFriendly"
                        value={value}
                        set={set}
                    />
                    <AdvField
                        icon={<ShieldCheck className="size-3.5" />}
                        label="Sicherheit">
                        <Select
                            value={value.security}
                            onValueChange={(v: string) => set("security", v as AdvancedFilter["security"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="camera">Kameraüberwacht</SelectItem>
                                <SelectItem value="guarded">Bewacht</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <AdvField
                        icon={<Timer className="size-3.5" />}
                        label="Max. Parkdauer">
                        <Select
                            value={value.maxStay}
                            onValueChange={(v: string) => set("maxStay", v as AdvancedFilter["maxStay"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                <SelectItem value="1h">≥ 1 Stunde</SelectItem>
                                <SelectItem value="2h">≥ 2 Stunden</SelectItem>
                                <SelectItem value="4h">≥ 4 Stunden</SelectItem>
                                <SelectItem value="8h">≥ 8 Stunden</SelectItem>
                                <SelectItem value="24h">≥ 24 Stunden</SelectItem>
                            </SelectContent>
                        </Select>
                    </AdvField>
                    <YesNoField
                        icon={<BatteryCharging className="size-3.5" />}
                        label="Nur E-Fahrzeuge"
                        k="evOnly"
                        value={value}
                        set={set}
                    />
                    <YesNoField
                        icon={<Train className="size-3.5" />}
                        label="Park & Ride"
                        k="parkAndRide"
                        value={value}
                        set={set}
                    />
                </div>
                <DialogFooter className="!mx-0 !mb-0 rounded-none border-t p-4">
                    <Button
                        variant="ghost"
                        onClick={() => onChange({ ...defaultAdvanced })}>
                        <X /> Zurücksetzen
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>Übernehmen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AdvField({
    label,
    icon,
    trailing,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    trailing?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card/50 p-3">
            <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {icon}
                    {label}
                </Label>
                {trailing}
            </div>
            {children}
        </div>
    );
}

type YesNoKeys = {
    [K in keyof AdvancedFilter]: AdvancedFilter[K] extends "all" | "yes" ? K : never;
}[keyof AdvancedFilter];

function YesNoField<K extends YesNoKeys>({
    icon,
    label,
    k,
    value,
    set,
}: {
    icon: React.ReactNode;
    label: string;
    k: K;
    value: AdvancedFilter;
    set: <KK extends keyof AdvancedFilter>(k: KK, v: AdvancedFilter[KK]) => void;
}) {
    return (
        <AdvField
            icon={icon}
            label={label}>
            <Select
                value={value[k] as string}
                onValueChange={(v: string) => set(k, v as AdvancedFilter[K])}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="yes">Ja</SelectItem>
                </SelectContent>
            </Select>
        </AdvField>
    );
}
