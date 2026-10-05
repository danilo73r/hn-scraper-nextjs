import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntriesBrowser } from "@/features/hacker-news/get-entries/ui/entries-browser";

const entries = [
  { rank: 8, title: "First story", points: 5, comments: 2 },
  { rank: 2, title: "Second story", points: 100, comments: 40 },
];
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("entries data", () => {
  it("loads all on startup and shows the API's order", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ entries }));
    render(<EntriesBrowser />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading stories");

    await screen.findByText("First story");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/entries?filter=all",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("First story")).toBeVisible();
    expect(within(rows[1]).getByText("Second story")).toBeVisible();
    expect(screen.getByText("2 entries")).toBeVisible();
  });

  it("requests the selected filter and shows its results", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(Response.json({ entries }))
      .mockResolvedValueOnce(Response.json({ entries: [entries[1]] }));
    render(<EntriesBrowser />);
    await screen.findByText("First story");
    await user.click(screen.getByRole("button", { name: /short titles/i }));
    await screen.findByText("1 entry");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/entries?filter=short-title",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.queryByText("First story")).not.toBeInTheDocument();
    expect(screen.getByText("Second story")).toBeVisible();
  });

  it("shows an empty message after a successful empty response", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ entries: [] }));
    render(<EntriesBrowser />);
    expect(await screen.findByText("No stories to show yet.")).toBeVisible();
  });

  it("keeps the previous list in place while the next filter loads", async () => {
    const user = userEvent.setup();
    let resolveNext!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(Response.json({ entries }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveNext = resolve;
          }),
      );
    render(<EntriesBrowser />);
    await screen.findByText("First story");
    await user.click(screen.getByRole("button", { name: /short titles/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Loading stories");
    expect(screen.getByText("First story")).toBeInTheDocument();
    expect(screen.getByRole("list", { hidden: true })).toHaveAttribute(
      "aria-label",
      "Stories",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await act(async () => {
      resolveNext(Response.json({ entries: [entries[1]] }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("First story")).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toBeVisible();
  });

  it.each(["HTTP", "network"])(
    "shows a %s failure and allows retrying",
    async (failure) => {
      const user = userEvent.setup();
      if (failure === "HTTP")
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
      else
        fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
      fetchMock.mockResolvedValueOnce(Response.json({ entries }));
      render(<EntriesBrowser />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not load stories.",
      );
      await user.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("First story")).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it("cancels the previous request and ignores its late response", async () => {
    const user = userEvent.setup();
    let resolveOld!: (response: Response) => void;
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce(Response.json({ entries: [entries[1]] }));
    render(<EntriesBrowser />);
    const oldSignal = fetchMock.mock.calls[0][1]?.signal;
    await user.click(screen.getByRole("button", { name: /long titles/i }));
    expect(await screen.findByText("Second story")).toBeVisible();
    expect(oldSignal?.aborted).toBe(true);

    await act(async () => {
      resolveOld(Response.json({ entries: [entries[0]] }));
    });
    expect(screen.queryByText("First story")).not.toBeInTheDocument();
    expect(screen.getByText("Second story")).toBeVisible();
  });
});
