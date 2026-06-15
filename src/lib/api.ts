import type {
    CommentDto,
    CommentPostRequest,
    ParkingSpaceDto,
    ReviewDto,
    ReviewPostRequest,
    UserDto,
    UserPostRequestDto,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE = (globalThis as any).__ENV__?.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        credentials: "include",
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        let msg = "";
        try {
            msg = (await res.text()).trim();
        } catch {
            /* ignore */
        }
        // Try to extract a "message" field from JSON error bodies
        if (msg.startsWith("{")) {
            try {
                const j = JSON.parse(msg);
                if (typeof j?.message === "string") msg = j.message;
                else if (typeof j?.error === "string") msg = j.error;
            } catch {
                /* keep raw */
            }
        }
        throw new Error(msg || `${res.status} ${res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    const txt = await res.text();
    return txt ? (JSON.parse(txt) as T) : (undefined as T);
}

/** Spring Security default form login at POST /login. */
export async function springLogin(username: string, password: string): Promise<void> {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${BASE}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        redirect: "manual",
    });
    if (res.type === "opaqueredirect") return;
    if (!res.ok) {
        let msg = "";
        try {
            msg = (await res.text()).trim();
        } catch {
            /* ignore */
        }
        throw new Error(msg || `Login fehlgeschlagen (${res.status})`);
    }
}

/** Logout */
export async function springLogout(): Promise<void> {
    await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}

export const api = {
    // auth
    getCurrentUser: () => req<UserDto>("/api/v1/public/profiles/me"),
    // parking spaces (public)
    getParkingSpacesBulk: (osmIds: number[]) =>
        req<ParkingSpaceDto[]>("/api/v1/public/parkingspaces", {
            method: "POST",
            body: JSON.stringify({ osmIds }),
        }),
    getParkingSpace: (id: number) => req<ParkingSpaceDto>(`/api/v1/public/parkingspaces/${id}`),
    getReviewsForSpace: (id: number) => req<ReviewDto[]>(`/api/v1/public/parkingspaces/${id}/reviews`),
    getCommentsForSpace: (id: number) => req<CommentDto[]>(`/api/v1/public/parkingspaces/${id}/comments`),
    // create / update reviews (review-controller)
    createReview: (body: ReviewPostRequest) =>
        req<void>(`/api/v1/reviews`, { method: "POST", body: JSON.stringify(body) }),
    updateReview: (osmId: number, body: ReviewPostRequest) =>
        req<void>(`/api/v1/reviews/${osmId}`, { method: "PUT", body: JSON.stringify(body) }),
    // create / update comments (comment-controller)
    createComment: (body: CommentPostRequest) =>
        req<void>(`/api/v1/comments`, { method: "POST", body: JSON.stringify(body) }),
    updateComment: (osmId: number, body: CommentPostRequest) =>
        req<void>(`/api/v1/comments/${osmId}`, { method: "PUT", body: JSON.stringify(body) }),
    upvoteComment: (commentId: number) => req<void>(`/api/v1/comments/${commentId}/upvote`, { method: "POST" }),
    deleteUpvoteComment: (commentId: number) => req<void>(`/api/v1/comments/${commentId}/upvote`, { method: "DELETE" }),
    downvoteComment: (commentId: number) => req<void>(`/api/v1/comments/${commentId}/downvote`, { method: "POST" }),
    deleteDownvoteComment: (commentId: number) =>
        req<void>(`/api/v1/comments/${commentId}/downvote`, { method: "DELETE" }),
    // moderator management (admin)
    addModerator: (id: number) => req<void>(`/api/v1/users/${id}/moderator`, { method: "POST" }),
    removeModerator: (id: number) => req<void>(`/api/v1/users/${id}/moderator`, { method: "DELETE" }),
    // users / auth
    register: (body: UserPostRequestDto) =>
        req<UserDto>("/api/v1/public/register", { method: "POST", body: JSON.stringify(body) }),
    getAdminUsers: () => req<UserDto[]>("/api/v1/users"),
    getAdminUser: (id: number) => req<UserDto>(`/api/v1/users/${id}`),
    // user block management (admin)
    blockUser: (id: number) => req<void>(`/api/v1/users/${id}/block`, { method: "POST" }),
    unblockUser: (id: number) => req<void>(`/api/v1/users/${id}/block`, { method: "DELETE" }),
    deleteUser: (id: number) => req<void>(`/api/v1/users/${id}`, { method: "DELETE" }),
    // user delete reviews/comments (own resources)
    deleteReview: (osmId: number) => req<void>(`/api/v1/reviews/${osmId}`, { method: "DELETE" }),
    deleteComment: (osmId: number) => req<void>(`/api/v1/comments/${osmId}`, { method: "DELETE" }),
    // admin delete reviews/comments
    adminDeleteReview: (reviewId: number) => req<void>(`/api/v1/admin/reviews/${reviewId}`, { method: "DELETE" }),
    adminDeleteComment: (commentId: number) => req<void>(`/api/v1/admin/comments/${commentId}`, { method: "DELETE" }),
};
