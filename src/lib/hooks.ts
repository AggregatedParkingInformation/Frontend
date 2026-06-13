import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { fetchParkplaetzeInBbox, type Bbox } from "./osm";
import { searchPlaces } from "./geocode";
import type { CommentPostRequest, ReviewPostRequest, UserPostRequestDto } from "./types";

export function useOsmParkplaetze(bbox: Bbox | null) {
    return useQuery({
        queryKey: ["osm", bbox && [bbox.south, bbox.west, bbox.north, bbox.east].map((n) => n.toFixed(2)).join(",")],
        enabled: !!bbox,
        queryFn: ({ signal }) => fetchParkplaetzeInBbox(bbox!, signal),
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
        retry: 1,
    });
}

export function useParkingSpacesBulk(osmIds: number[]) {
    const key = osmIds.length ? [...osmIds].sort((a, b) => a - b) : [];
    return useQuery({
        queryKey: ["parkingspaces", key],
        queryFn: () => api.getParkingSpacesBulk(osmIds),
        enabled: osmIds.length > 0,
        staleTime: 1000 * 60,
        retry: 1,
    });
}

/** Place suggestions via Nominatim geocoder. */
export function usePlaceSuggestions(q: string) {
    const term = q.trim();
    return useQuery({
        queryKey: ["geocode", term],
        queryFn: ({ signal }) => searchPlaces(term, signal),
        enabled: term.length >= 2,
        staleTime: 1000 * 60 * 5,
        retry: 0,
    });
}

export function useSpaceReviews(osmBackendId: number | null) {
    return useQuery({
        queryKey: ["space-reviews", osmBackendId],
        queryFn: () => api.getReviewsForSpace(osmBackendId!),
        enabled: osmBackendId != null,
        retry: 1,
    });
}

export function useSpaceComments(osmBackendId: number | null) {
    return useQuery({
        queryKey: ["space-comments", osmBackendId],
        queryFn: () => api.getCommentsForSpace(osmBackendId!),
        enabled: osmBackendId != null,
        retry: 1,
    });
}

export function useCreateReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ReviewPostRequest) => api.createReview(body),
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["space-reviews"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
            void vars;
        },
    });
}

export function useCreateComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CommentPostRequest) => api.createComment(body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-comments"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
            // invalidate review queries as well may affect comment count
            qc.invalidateQueries({ queryKey: ["space-reviews"] });
        },
    });
}

// New hooks for updating and deleting reviews/comments
export function useUpdateReview() {
    const qc = useQueryClient();
    return useMutation({
        // body includes osmId and updated fields
        mutationFn: (body: ReviewPostRequest & { osmId: number }) => api.updateReview(body.osmId, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-reviews"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
        },
    });
}

export function useAdminDeleteReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (reviewId: number) => api.adminDeleteReview(reviewId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-reviews"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
        },
    });
}

export function useAdminDeleteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (commentId: number) => api.adminDeleteComment(commentId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-comments"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
        },
    });
}

export function useUpdateComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CommentPostRequest & { osmId: number }) => api.updateComment(body.osmId, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-comments"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
        },
    });
}

export function useDeleteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (osmId: number) => api.deleteComment(osmId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-comments"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
        },
    });
}

export function useDeleteReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (osmId: number) => api.deleteReview(osmId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["space-reviews"] });
            qc.invalidateQueries({ queryKey: ["parkingspaces"] });
        },
    });
}

export function useRegister() {
    return useMutation({
        mutationFn: (body: UserPostRequestDto) => api.register(body),
    });
}

export function useAdminUsers(enabled: boolean) {
    return useQuery({
        queryKey: ["users"],
        queryFn: api.getAdminUsers,
        retry: 1,
        enabled,
    });
}

export function useDeleteUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteUser(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    });
}

// Comment voting hooks
export function useUpvoteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (commentId: number) => api.upvoteComment(commentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["space-comments"] }),
    });
}

export function useDeleteUpvoteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (commentId: number) => api.deleteUpvoteComment(commentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["space-comments"] }),
    });
}

export function useDownvoteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (commentId: number) => api.downvoteComment(commentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["space-comments"] }),
    });
}

export function useDeleteDownvoteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (commentId: number) => api.deleteDownvoteComment(commentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["space-comments"] }),
    });
}
