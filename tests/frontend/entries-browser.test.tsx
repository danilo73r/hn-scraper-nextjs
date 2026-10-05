import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EntriesBrowser } from "@/features/hacker-news/get-entries/ui/entries-browser";
import { EntriesList } from "@/features/hacker-news/get-entries/ui/entries-list";

describe("EntriesBrowser", () => {
  it("selects long titles initially and switches filters", async () => {
    const user = userEvent.setup();
    render(<EntriesBrowser />);

    const longTitles = screen.getByRole("button", { name: /long titles/i });
    const shortTitles = screen.getByRole("button", { name: /short titles/i });
    expect(longTitles).toHaveAttribute("aria-pressed", "true");

    await user.click(shortTitles);
    expect(shortTitles).toHaveAttribute("aria-pressed", "true");
    expect(longTitles).toHaveAttribute("aria-pressed", "false");

    await user.click(longTitles);
    expect(longTitles).toHaveAttribute("aria-pressed", "true");
  });

  it("supports filter selection with the keyboard", async () => {
    const user = userEvent.setup();
    render(<EntriesBrowser />);

    await user.tab();
    await user.tab();
    const shortTitles = screen.getByRole("button", { name: /short titles/i });
    expect(shortTitles).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(shortTitles).toHaveAttribute("aria-pressed", "true");
  });
});

describe("EntriesList", () => {
  it("shows titles, ranks and metrics in the received order", () => {
    render(
      <EntriesList
        entries={[
          { rank: 8, title: "First story", points: 42, comments: 12 },
          { rank: 2, title: "Second story", points: 100, comments: 0 },
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("First story")).toBeVisible();
    expect(within(rows[0]).getByText("8")).toBeVisible();
    expect(within(rows[0]).getByText("42 points")).toBeVisible();
    expect(within(rows[0]).getByText("12 comments")).toBeVisible();
    expect(within(rows[1]).getByText("Second story")).toBeVisible();
  });

  it("shows an empty message when there are no entries", () => {
    render(<EntriesList entries={[]} />);
    expect(screen.getByText("No stories to show yet.")).toBeVisible();
  });
});
