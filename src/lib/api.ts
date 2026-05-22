import type {
    CommentDto,
    CommentPostRequest,
    ParkingSpaceDto,
    PrivilegeDto,
    ReviewDto,
    ReviewPostRequest,
    UserDto,
    UserPostRequestDto,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        credentials: "include",
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if (res.status === 204) return undefined as T;
    const txt = await res.text();
    return txt ? (JSON.parse(txt) as T) : (undefined as T);
}

/**
 * Spring Security default form login at POST /login.
 * On success the server sets a JSESSIONID cookie (requires credentials: "include").
 */
export async function springLogin(username: string, password: string): Promise<void> {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${BASE}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        redirect: "manual",
    });
    // Spring antwortet bei Erfolg meist mit 302 Redirect; "manual" macht das zu type:"opaqueredirect" (ok).
    if (res.type === "opaqueredirect") return;
    if (!res.ok) throw new Error(`Login fehlgeschlagen (${res.status})`);
}

export async function springLogout(): Promise<void> {
    await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}

export const api = {
    // parking spaces
    getParkingSpaces: () => req<ParkingSpaceDto[]>("/api/v1/parkingspaces"),
    getParkingSpace: (id: number) => req<ParkingSpaceDto>(`/api/v1/parkingspaces/${id}`),
    getReviewsForSpace: (id: number) => req<ReviewDto[]>(`/api/v1/parkingspaces/${id}/reviews`),
    getCommentsForSpace: (id: number) => req<CommentDto[]>(`/api/v1/parkingspaces/${id}/comments`),

    // reviews / comments
    createReview: (body: ReviewPostRequest) =>
        req<ReviewDto>("/api/v1/reviews", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    createComment: (body: CommentPostRequest) =>
        req<CommentDto>("/api/v1/comments", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    // users / auth
    register: (body: UserPostRequestDto) =>
        req<UserDto>("/api/v1/public/register", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    getUsers: () => req<UserDto[]>("/api/v1/users"),
    getUser: (id: number) => req<UserDto>(`/api/v1/users/${id}`),
    deleteUser: (id: number) => req<void>(`/api/v1/users/${id}`, { method: "DELETE" }),

    // privileges
    getPrivileges: () => req<PrivilegeDto[]>("/api/v1/privileges"),
    deletePrivilege: (id: number) => req<void>(`/api/v1/privileges/${id}`, { method: "DELETE" }),
};
