import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./api", () => ({
    api: {
        createComment: vi.fn(),
    },
}));

vi.mock("./osm", () => ({
    fetchParkplaetzeInBbox: vi.fn(),
}));

vi.mock("./geocode", () => ({
    searchPlaces: vi.fn(),
}));

import { usePlaceSuggestions } from "./hooks";
import { useCreateComment } from "./hooks";
import { api } from "./api";
import { searchPlaces } from "./geocode";
import type { CommentPostRequest } from "./types";

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe("usePlaceSuggestions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("no search with less than 2 characters", () => {
        renderHook(() => usePlaceSuggestions("a"), {
            wrapper: createWrapper(),
        });

        expect(searchPlaces).not.toHaveBeenCalled();
    });

    it("performs search with 2 or more characters", async () => {
        vi.mocked(searchPlaces).mockResolvedValue([]);

        renderHook(() => usePlaceSuggestions("mün"), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(searchPlaces).toHaveBeenCalled();
        });
    });

    it("trims whitespace before searching", async () => {
        vi.mocked(searchPlaces).mockResolvedValue([]);

        renderHook(() => usePlaceSuggestions("   mün   "), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(searchPlaces).toHaveBeenCalledWith("mün", expect.any(AbortSignal));
        });
    });
});

describe("useCreateComment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls api.createComment", async () => {
        vi.mocked(api.createComment).mockResolvedValue(undefined);

        const { result } = renderHook(() => useCreateComment(), {
            wrapper: createWrapper(),
        });

        const body: CommentPostRequest = {
            osmId: 123,
            commentText: "Testkommentar",
        };

        await result.current.mutateAsync(body);

        expect(api.createComment).toHaveBeenCalledWith(body);
    });
});
