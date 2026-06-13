import type { RoleName, UserDto } from "@/lib/types";

export const ROLE = {
    USER: "ROLE_USER",
    STAFF: "ROLE_STAFF",
    ADMIN: "ROLE_ADMIN",
} as const satisfies Record<string, RoleName>;

export const ROLE_LABELS: Record<RoleName, string> = {
    ROLE_USER: "Nutzer",
    ROLE_STAFF: "Staff",
    ROLE_ADMIN: "Administrator",
};

type RoleBearing = Pick<UserDto, "roles"> | null | undefined;

export function hasRole(user: RoleBearing, role: RoleName): boolean {
    return user?.roles?.some((r) => r.name === role) ?? false;
}

export function userIsAdmin(user: RoleBearing): boolean {
    return hasRole(user, ROLE.ADMIN);
}

export function userIsStaff(user: RoleBearing): boolean {
    return hasRole(user, ROLE.STAFF);
}
