import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import { FilterPanel, defaultFilter } from "./FilterPanel";
import type { FilterState } from "./FilterPanel";

// ----------------------
// Mocks
// ----------------------
vi.mock("@/lib/hooks", () => ({
  usePlaceSuggestions: () => ({
    data: [
      { id: "1", label: "Munich, Germany" },
      { id: "2", label: "Berlin, Germany" },
    ],
    isFetching: false,
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// ----------------------
// Helpers
// ----------------------
const baseState: FilterState = {
  ...defaultFilter,
};

const renderPanel = (override?: Partial<FilterState>) => {
  const setState = vi.fn();
  const onSearch = vi.fn();
  const onShowNearby = vi.fn();
  const onPlaceSelect = vi.fn();

  const state = { ...baseState, ...override };

  render(
    <FilterPanel
      state={state}
      setState={setState}
      onSearch={onSearch}
      onShowNearby={onShowNearby}
      onPlaceSelect={onPlaceSelect}
    />
  );

  return { setState, onSearch, onShowNearby, onPlaceSelect };
};

// ----------------------
// Tests
// ----------------------
describe("FilterPanel", () => {
  test("renders search input", () => {
    renderPanel();
    expect(screen.getByPlaceholderText(/Ort, Region/i)).toBeInTheDocument();
  });

  test("updates search input", async () => {
    const user = userEvent.setup();
    const { setState } = renderPanel();

    const input = screen.getByPlaceholderText(/Ort, Region/i);

    await user.type(input, "München");

    expect(setState).toHaveBeenCalled();
  });

  test("clears search when X button is clicked", async () => {
    const user = userEvent.setup();
    const { setState } = renderPanel({ suche: "Berlin" });

    const clearBtn = screen.getByRole("button", { name: /Suche löschen/i });

    await user.click(clearBtn);

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ suche: "" })
    );
  });

  test("calls onShowNearby when nearby button clicked", async () => {
    const user = userEvent.setup();
    const { onShowNearby } = renderPanel();

    await user.click(screen.getByText(/Nächste Parkplätze/i));

    expect(onShowNearby).toHaveBeenCalled();
  });

  test("changes type filter", async () => {
    const user = userEvent.setup();
    const { setState } = renderPanel();

    await user.click(screen.getByText("Wandern"));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        typ: "wandern",
      })
    );
  });

  test("changes rating filter", async () => {
    const user = userEvent.setup();
    const { setState } = renderPanel();

    await user.click(screen.getByText("3"));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        minSterne: 3,
      })
    );
  });

});