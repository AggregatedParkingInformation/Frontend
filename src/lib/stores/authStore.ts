import { create } from "zustand";
import { api } from "@/lib/api";
import type { UserDto, UserPermissions } from "@/lib/types";

type AuthState = {
    user: UserDto | null;
    permissions: UserPermissions | null;
    status: "idle" | "loading" | "ready";
    isAdmin: boolean;
    loadOnce: () => Promise<void>;
    refresh: () => Promise<void>;
    setUser: (u: UserDto | null) => void;
    clear: () => void;
};

function deriveAdmin(u: UserDto | null, p: UserPermissions | null): boolean {
    if (p?.isAdmin) return true;
    return !!u?.roles?.some((r) => r.name === "ROLE_ADMIN");
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    permissions: null,
    status: "idle",
    isAdmin: false,
    loadOnce: async () => {
        if (get().status !== "idle") return;
        await get().refresh();
    },
    refresh: async () => {
        set({ status: "loading" });
        try {
            const user = await api.getCurrentUser().catch(() => null);
            let permissions: UserPermissions | null = null;
            if (user) {
                permissions = await api.getUserPermissions().catch(() => null);
            }
            set({
                user,
                permissions,
                isAdmin: deriveAdmin(user, permissions),
                status: "ready",
            });
        } catch {
            set({ user: null, permissions: null, isAdmin: false, status: "ready" });
        }
    },
    setUser: (u) =>
        set((s) => ({
            user: u,
            isAdmin: deriveAdmin(u, s.permissions),
            status: "ready",
        })),
    clear: () => set({ user: null, permissions: null, isAdmin: false, status: "ready" }),
}));
