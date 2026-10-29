import { useState } from "react";
import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { ThreadFindBar } from "./ThreadFindBar";
import { stepThreadFindIndex } from "./threadFind";

function Find() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("needle");
  const [index, setIndex] = useState(0);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reopen</button>
      <ThreadFindBar
        open={open}
        query={query}
        matchCount={query ? 3 : 0}
        status={null}
        activeIndex={index}
        focusRequestId={0}
        onRetry={() => {}}
        onQueryChange={setQuery}
        onNext={() => setIndex((previous) => stepThreadFindIndex(previous, 3, 1))}
        onPrevious={() => setIndex((previous) => stepThreadFindIndex(previous, 3, -1))}
        onClose={() => {
          setOpen(false);
          setQuery("");
          setIndex(0);
        }}
      />
    </>
  );
}

it("navigates from the input, preserves native button Enter, and closes from a focused find control", async () => {
  await using screen = await render(<Find />, { router: false });
  const input = screen.getByRole("searchbox", { name: "Find in thread" });
  await expect.element(input).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByText("2/3")).toBeVisible();
  await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
  await expect.element(screen.getByText("1/3")).toBeVisible();
  await userEvent.tab();
  await expect.element(screen.getByRole("button", { name: "Previous match" })).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByText("3/3")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.element(input).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "Reopen" }).click();
  await expect.element(screen.getByRole("searchbox", { name: "Find in thread" })).toHaveValue("");
});
