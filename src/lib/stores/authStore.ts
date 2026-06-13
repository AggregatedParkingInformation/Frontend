import { create } from "zustand";
import { api } from "@/lib/api";
import type { UserDto } from "@/lib/types";

type AuthState = {
    user: UserDto | null;
    status: "idle" | "loading" | "ready";
    loadOnce: () => Promise<void>;
    refresh: () => Promise<void>;
    setUser: (u: UserDto | null) => void;
    clear: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    status: "idle",
    loadOnce: async () => {
        if (get().status !== "idle") return;
        await get().refresh();
    },
    refresh: async () => {
        set({ status: "loading" });
        try {
            const user = await api.getCurrentUser().catch(() => null);
            set({
                user,
                status: "ready",
            });
        } catch {
            set({ user: null, status: "ready" });
        }
    },
    setUser: (u) =>
        set({
            user: u,
            status: "ready",
        }),
    clear: () => set({ user: null, status: "ready" }),
}));
