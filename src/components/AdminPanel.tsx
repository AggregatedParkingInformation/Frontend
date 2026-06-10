import { useState } from "react";
import { Ban, Check, Loader2, Trash2, UserPlus, UserX } from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDeleteUser, useUsers } from "@/lib/hooks";
import type { UserDto } from "@/lib/types";
import { toast } from "sonner";

type Props = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
};

export function AdminPanel({ open, onOpenChange }: Props) {
    const usersQ = useUsers();
    const delUser = useDeleteUser();
    const [confirmDel, setConfirmDel] = useState<UserDto | null>(null);
    const [suspended, setSuspended] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");
    const qc = useQueryClient();

    const blockUserMut = useMutation({
        mutationFn: (id: number) => api.blockUser(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    });
    const unblockUserMut = useMutation({
        mutationFn: (id: number) => api.unblockUser(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    });

    // moderator management mutations
    const addModeratorMut = useMutation({
        mutationFn: (id: number) => api.addModerator(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    });
    const removeModeratorMut = useMutation({
        mutationFn: (id: number) => api.removeModerator(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    });
    const toggle = (id: number) => {
        if (suspended.has(id)) {
            // currently blocked, unblock
            unblockUserMut.mutate(id);
        } else {
            // block user
            blockUserMut.mutate(id);
        }
        setSuspended((s) => {
            const ns = new Set(s);
            if (ns.has(id)) ns.delete(id);
            else ns.add(id);
            return ns;
        });
    };

    const users = (usersQ.data ?? []).filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));

    return (
        <>
            <Sheet
                open={open}
                onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col">
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
                                            <TableHead className="w-full">Nutzer</TableHead>
                                            <TableHead className="text-right w-0 whitespace-nowrap">Aktionen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => {
                                            const blocked = suspended.has(u.id);
                                            const isMod = u.roles?.some((r) => r.name === "ROLE_STAFF");
                                            const isAdmin = u.roles?.some((r) => r.name === "ROLE_ADMIN");
                                            return (
                                                <TableRow key={u.id}>
                                                    <TableCell className="font-medium max-w-0">
                                                        <div
                                                            className="truncate block"
                                                            title={u.username}>
                                                            {u.username}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                                                            <span>#{u.id}</span>
                                                            {blocked ? (
                                                                <Badge variant="destructive">Gesperrt</Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Aktiv</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            {/* Moderator toggle button */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={!isMod && isAdmin}
                                                                onClick={() => {
                                                                    if (isMod) {
                                                                        removeModeratorMut.mutate(u.id);
                                                                    } else {
                                                                        addModeratorMut.mutate(u.id);
                                                                    }
                                                                }}>
                                                                {!isMod && isAdmin ? (
                                                                    <Ban className="mr-1 h-4 w-4 text-red-500" />
                                                                ) : isMod ? (
                                                                    <UserX className="mr-1 h-4 w-4 text-emerald-500" />
                                                                ) : (
                                                                    <UserPlus className="mr-1 h-4 w-4 text-gray-400" />
                                                                )}
                                                                Mod
                                                            </Button>
                                                            {/* Block / Unblock button */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => toggle(u.id)}>
                                                                {blocked ? (
                                                                    <>
                                                                        <Check className="mr-1 h-4 w-4" /> Aktivieren
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Ban className="mr-1 h-4 w-4" /> Sperren
                                                                    </>
                                                                )}
                                                            </Button>
                                                            {/* Delete button */}
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => setConfirmDel(u)}>
                                                                <Trash2 className="h-4 w-4" />
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
