import { useState } from "react";
import { Ban, Check, Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteUser, usePrivileges, useUsers } from "@/lib/hooks";
import type { UserDto } from "@/lib/types";
import { toast } from "sonner";

type Props = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
};

export function AdminPanel({ open, onOpenChange }: Props) {
    const usersQ = useUsers();
    const privsQ = usePrivileges();
    const delUser = useDeleteUser();
    const [confirmDel, setConfirmDel] = useState<UserDto | null>(null);
    const [suspended, setSuspended] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");

    const toggle = (id: number) =>
        setSuspended((s) => {
            const ns = new Set(s);
            if (ns.has(id)) ns.delete(id);
            else ns.add(id);
            return ns;
        });

    const users = (usersQ.data ?? []).filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));

    return (
        <>
            <Sheet
                open={open}
                onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
                    <SheetHeader className="p-6 pb-4 border-b">
                        <SheetTitle className="font-heading">Admin-Panel</SheetTitle>
                        <SheetDescription>Verwalte Nutzer und Privilegien.</SheetDescription>
                    </SheetHeader>

                    <div className="p-4 flex flex-col gap-4 flex-1 overflow-auto">
                        <Input
                            placeholder="Nutzer suchen…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10"
                        />

                        <div className="rounded-xl border overflow-hidden">
                            {usersQ.isLoading ? (
                                <div className="p-8 flex items-center justify-center text-muted-foreground gap-2">
                                    <Loader2 className="size-4 animate-spin" />
                                    Lade Nutzer…
                                </div>
                            ) : usersQ.isError ? (
                                <div className="p-8 text-sm text-destructive text-center">
                                    Backend nicht erreichbar.
                                </div>
                            ) : users.length === 0 ? (
                                <div className="p-8 text-sm text-muted-foreground text-center">
                                    Keine Nutzer gefunden.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nutzer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Aktionen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => {
                                            const blocked = suspended.has(u.id);
                                            return (
                                                <TableRow key={u.id}>
                                                    <TableCell className="font-medium">
                                                        {u.username}
                                                        <div className="text-xs text-muted-foreground">#{u.id}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {blocked ? (
                                                            <Badge variant="destructive">Gesperrt</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Aktiv</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => toggle(u.id)}>
                                                                {blocked ? (
                                                                    <>
                                                                        <Check /> Aktivieren
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Ban /> Sperren
                                                                    </>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => setConfirmDel(u)}>
                                                                <Trash2 />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold mb-2">Privilegien</h3>
                            <div className="flex flex-wrap gap-2">
                                {(privsQ.data ?? []).map((p) => (
                                    <Badge
                                        key={p.id}
                                        variant="outline"
                                        className="text-xs">
                                        {p.name}
                                    </Badge>
                                ))}
                                {!privsQ.isLoading && (privsQ.data ?? []).length === 0 && (
                                    <span className="text-xs text-muted-foreground">Keine Privilegien vorhanden.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={!!confirmDel}
                onOpenChange={(b) => !b && setConfirmDel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Nutzer {confirmDel?.username} löschen?</AlertDialogTitle>
                        <AlertDialogDescription>Diese Aktion entfernt den Account dauerhaft.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!confirmDel) return;
                                try {
                                    await delUser.mutateAsync(confirmDel.id);
                                    toast.success("Nutzer gelöscht");
                                } catch {
                                    toast.error("Löschen fehlgeschlagen");
                                }
                                setConfirmDel(null);
                            }}>
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
