import { useState } from "react";
import { Award, LogOut, Shield, User as UserIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuthDialog } from "./AuthDialog";
import { AdminPanel } from "./AdminPanel";
import { springLogout } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { UserDto } from "@/lib/types";
import { useAuthStore } from "@/lib/stores/authStore";

export type AuthUser = UserDto | null;

type Props = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    initialAuthOpen?: boolean;
    onAuthOpenChange?: (b: boolean) => void;
};

export function ProfileSheet({ open, onOpenChange, initialAuthOpen, onAuthOpenChange }: Props) {
    const qc = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const clearAuth = useAuthStore((s) => s.clear);
    const setUser = useAuthStore((s) => s.setUser);
    const [authOpenInner, setAuthOpenInner] = useState(false);
    const authOpen = initialAuthOpen ?? authOpenInner;
    const setAuthOpen = (b: boolean) => {
        if (onAuthOpenChange) onAuthOpenChange(b);
        else setAuthOpenInner(b);
    };

    const [adminOpen, setAdminOpen] = useState(false);

    const roleLabels: Record<string, string> = {
        ROLE_ADMIN: "Administrator",
        ROLE_STAFF: "Staff",
    };

    return (
        <>
            <Sheet
                open={open}
                onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
                    <SheetHeader className="p-6 pb-4 border-b">
                        <SheetTitle className="flex items-center gap-2 font-heading">
                            <UserIcon className="size-5" /> Mein Profil
                        </SheetTitle>
                        <SheetDescription>
                            {user ? `Angemeldet als ${user.username}` : "Du bist als Gast unterwegs."}
                            {user?.roles?.map((role) =>
                                roleLabels[role.name] ? (
                                    <Badge
                                        key={role.name}
                                        className="ml-2">
                                        {roleLabels[role.name]}
                                    </Badge>
                                ) : null,
                            )}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                        {user ? (
                            <>
                                <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(140_45%_22%)] text-[hsl(var(--brand-foreground))] p-5 shadow-lg">
                                    <div className="flex items-center gap-2 text-xs opacity-90 uppercase tracking-wide">
                                        <Award className="size-4" /> Punktestand
                                    </div>
                                    <div className="text-5xl font-bold mt-2 font-heading tabular-nums">
                                        {user?.score ?? 0}
                                    </div>
                                    <div className="text-xs opacity-80 mt-2">
                                        Sammle Punkte mit Bewertungen und Kommentaren.
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Stat
                                        label="Bewertungen"
                                        value={user?.reviews ?? 0}
                                    />
                                    <Stat
                                        label="Kommentare"
                                        value={user?.comments ?? 0}
                                    />
                                </div>

                                {user?.roles?.some((r) => r.name === "ROLE_ADMIN") && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Button
                                                variant="outline"
                                                className="w-full h-11"
                                                onClick={() => setAdminOpen(true)}>
                                                <Shield /> Admin-Panel öffnen
                                            </Button>
                                        </div>
                                    </>
                                )}

                                <Separator />

                                <Button
                                    variant="outline"
                                    className="h-11"
                                    onClick={async () => {
                                        await springLogout();
                                        clearAuth();
                                        qc.invalidateQueries({ queryKey: ["users"] });
                                    }}>
                                    <LogOut /> Abmelden
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-dashed p-6 text-center bg-muted/30">
                                    <div className="size-14 rounded-full bg-background border grid place-items-center mx-auto">
                                        <UserIcon className="size-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-heading font-semibold mt-3">Du nutzt die App als Gast</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Karten und Suche sind frei. Bewerten und Kommentieren benötigen ein Konto.
                                    </p>
                                </div>

                                <Button
                                    className="h-11"
                                    onClick={() => setAuthOpen(true)}>
                                    Einloggen / Registrieren
                                </Button>

                                <div className="text-xs text-muted-foreground text-center">
                                    Tipp: Mit Login Punkte sammeln und auf die Bestenliste klettern.
                                </div>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <AuthDialog
                open={authOpen}
                onOpenChange={setAuthOpen}
                onAuth={(profile) => {
                    setUser(profile);
                    qc.invalidateQueries({ queryKey: ["users"] });
                }}
            />
            <AdminPanel
                open={adminOpen}
                onOpenChange={setAdminOpen}
            />
        </>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border bg-card p-3">
            <div className="text-2xl font-semibold tabular-nums font-heading">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}
