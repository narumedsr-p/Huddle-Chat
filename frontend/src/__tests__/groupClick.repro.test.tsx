import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../components/AppShell";
import { JoinScreen } from "../components/JoinScreen";
import { ChatStoreProvider, useChatStore } from "../state/useChatStore";
import { fakeApi } from "./fakeApi";

vi.mock("../api", async () => {
  const mod = await import("./fakeApi");
  return { api: mod.fakeApi, ApiError: mod.FakeApiError };
});

// jsdom doesn't implement scrollIntoView (every real browser does) — stub it
// so MessageWindow's auto-scroll effect doesn't throw in tests.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  fakeApi.__reset();
});

function Root() {
  const { currentUser } = useChatStore();
  return currentUser ? <AppShell /> : <JoinScreen />;
}

function renderApp() {
  return render(
    <ChatStoreProvider>
      <Root />
    </ChatStoreProvider>,
  );
}

/** Joins and waits for the post-login clients roster (fetched from the fake
 * API) to land, so later synchronous `getByText("Nara")`-style lookups don't
 * race the initial poll. */
async function join(name: string) {
  fireEvent.change(screen.getByPlaceholderText("Your display name"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByText("Join chat"));
  await screen.findByText("Nara");
}

/** Clicking a Discover row opens a member-list modal with a "Join Group"
 * button at the bottom; joining closes the modal automatically. Waits for
 * the group roster poll first, and for the membership change to land after
 * clicking Join (both now real async calls against the fake API). */
async function joinGroupFromDiscover(groupName: string) {
  const row = await screen.findByText(groupName, { exact: false });
  fireEvent.click(row);
  fireEvent.click(screen.getByRole("button", { name: "Join Group" }));
  await screen.findByText("My Groups (1)");
}

describe("clicking a group row right after switching to the Groups tab", () => {
  it("opens the members popup on the very first click, no animation wait needed", async () => {
    renderApp();
    await join("TestUser");

    fireEvent.click(screen.getByText("Groups"));
    const row = await screen.findByText("Monkey Business", { exact: false });
    // Deliberately NOT waiting for any animation/timers here — mimics a fast click.
    fireEvent.click(row);

    expect(
      screen.getByRole("dialog", { name: /Monkey Business \(\d+\)/ }),
    ).toBeInTheDocument();
  });

  it("confirms the group row shows up later, once the exit animation settles", async () => {
    renderApp();
    await join("TestUser2");

    fireEvent.click(screen.getByText("Groups"));
    // This waits (via findBy's built-in polling) instead of asserting instantly.
    const row = await screen.findByText("Monkey Business", { exact: false });
    expect(row).toBeInTheDocument();
  });
});

describe("switching the active chat room right after clicking another user", () => {
  it("shows the new room's message box on the very first click", async () => {
    renderApp();
    await join("TestUser3");

    fireEvent.click(screen.getByText("Nara"));
    fireEvent.click(screen.getByText("Ploy"));

    expect(screen.getByPlaceholderText("Type a message…")).toBeInTheDocument();
  });
});

describe("switching from a private chat to a group chat", () => {
  it("does not carry over an unsent draft or stale content from the private room", async () => {
    renderApp();
    await join("TestUser4");

    // Open a private room and type a draft without sending it.
    fireEvent.click(screen.getByText("Nara"));
    fireEvent.change(screen.getByPlaceholderText("Type a message…"), {
      target: { value: "unsent private draft" },
    });

    // Join a group (doesn't navigate in) then open it explicitly from My Groups.
    fireEvent.click(screen.getByText("Groups"));
    await joinGroupFromDiscover("Monkey Business");
    fireEvent.click(screen.getByText("Monkey Business", { exact: false }));

    const groupInput = screen.getByPlaceholderText(
      "Type a message…",
    ) as HTMLTextAreaElement;
    expect(groupInput.value).toBe("");
  });
});

describe("the top tab strip for an open room", () => {
  it("shows a tab for an open private chat", async () => {
    renderApp();
    await join("TabTestUser1");

    fireEvent.click(screen.getByText("Nara"));

    // One in the top tab strip, one in the chat header.
    expect(screen.getAllByText("Nara").length).toBeGreaterThanOrEqual(2);
  });

  it("shows a tab for an open group chat the same way", async () => {
    renderApp();
    await join("TabTestUser2");

    fireEvent.click(screen.getByText("Groups"));
    await joinGroupFromDiscover("Monkey Business");
    // Joining only grants membership — open it explicitly from My Groups.
    fireEvent.click(screen.getByText("Monkey Business", { exact: false }));

    // One in the sidebar group list, one in the top tab strip, one in the chat header.
    expect(screen.getAllByText("Monkey Business").length).toBeGreaterThanOrEqual(3);
  });

  it("still shows the group tab after leaving Groups mode and reopening from My Groups", async () => {
    renderApp();
    await join("TabTestUser3");

    fireEvent.click(screen.getByText("Groups"));
    await joinGroupFromDiscover("Monkey Business");

    // Switch away to Users and back to Groups, then reopen straight from My Groups
    // (joined groups open on a single click now, no separate "Open chat" button).
    fireEvent.click(screen.getByText("Users"));
    fireEvent.click(screen.getByText("Groups"));
    fireEvent.click(screen.getByText("Monkey Business", { exact: false }));

    expect(screen.getAllByText("Monkey Business").length).toBeGreaterThanOrEqual(3);
  });
});

describe("joining a group", () => {
  it("does not open the room automatically", async () => {
    renderApp();
    await join("JoinNoOpenUser");

    fireEvent.click(screen.getByText("Groups"));
    await joinGroupFromDiscover("Monkey Business");

    // The modal should be gone, and only the sidebar's "My Groups" row shows
    // it — no top tab, no chat header.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Monkey Business").length).toBe(1);
    expect(screen.queryByPlaceholderText("Type a message…")).not.toBeInTheDocument();
  });
});

describe("leaving a group", () => {
  it("asks for confirmation, then removes the room and drops you back to the empty state", async () => {
    renderApp();
    await join("LeaveGroupUser");

    fireEvent.click(screen.getByText("Groups"));
    await joinGroupFromDiscover("Monkey Business");
    fireEvent.click(screen.getByText("Monkey Business", { exact: false }));

    fireEvent.click(screen.getByLabelText("Leave group"));
    expect(screen.getByText("Leave group?")).toBeInTheDocument();

    // Both the header icon and the modal's confirm button share the accessible
    // name "Leave group" — the modal's confirm button renders last in the DOM.
    const leaveButtons = screen.getAllByRole("button", { name: "Leave group" });
    fireEvent.click(leaveButtons[leaveButtons.length - 1]);

    expect(screen.queryByText("Leave group?")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type a message…")).not.toBeInTheDocument();
    // Back to just the sidebar's Discover row — clicking it should offer to
    // join again, confirming it's no longer in My Groups.
    fireEvent.click(screen.getByText("Monkey Business", { exact: false }));
    expect(screen.getByRole("button", { name: "Join Group" })).toBeInTheDocument();
  });
});

describe("viewing group members", () => {
  it("opens a modal listing the member names", async () => {
    renderApp();
    await join("MembersModalUser");

    fireEvent.click(screen.getByText("Groups"));
    await joinGroupFromDiscover("Monkey Business");
    fireEvent.click(screen.getByText("Monkey Business", { exact: false }));

    fireEvent.click(screen.getByLabelText("View members"));

    // "Nara" also shows up as a message-sender label in the group's chat
    // history behind the modal, so scope the member-list check to the dialog.
    const dialog = screen.getByRole("dialog", { name: /Monkey Business \(\d+\)/ });
    expect(within(dialog).getByText("Nara")).toBeInTheDocument();
    // This is the "view members" modal for an existing member — no join button.
    expect(within(dialog).queryByText("Join Group")).not.toBeInTheDocument();
  });
});

describe("logging out", () => {
  it("asks for confirmation before returning to the join screen", async () => {
    renderApp();
    await join("LogoutConfirmUser");

    fireEvent.click(screen.getByLabelText("Log out"));
    expect(screen.getByText("Log out?")).toBeInTheDocument();
    // Confirming is required — the join screen shouldn't show up yet.
    expect(screen.queryByPlaceholderText("Your display name")).not.toBeInTheDocument();

    // Both the footer icon and the modal's confirm button share the accessible
    // name "Log out" — the modal's confirm button renders last in the DOM.
    const logoutButtons = screen.getAllByRole("button", { name: "Log out" });
    fireEvent.click(logoutButtons[logoutButtons.length - 1]);

    expect(screen.getByPlaceholderText("Your display name")).toBeInTheDocument();
  });

  it("portals the confirm modal outside the blurred sidebar so it centers on the whole page", async () => {
    renderApp();
    await join("PortalCheckUser");

    fireEvent.click(screen.getByLabelText("Log out"));
    const dialog = screen.getByRole("dialog", { name: "Log out?" });

    // Sidebar.tsx's <aside> has backdrop-blur, which creates a new containing
    // block for position:fixed descendants — a non-portaled modal rendered
    // inside it would be confined to the sidebar's box instead of the page.
    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});

describe("the shared Modal primitive", () => {
  it("has a visible X close button", async () => {
    renderApp();
    await join("ModalCloseUser");

    fireEvent.click(screen.getByLabelText("Log out"));
    fireEvent.click(screen.getByLabelText("Close"));

    // The exit animation takes a tick to resolve, so wait for removal
    // instead of asserting synchronously.
    await waitFor(() =>
      expect(screen.queryByText("Log out?")).not.toBeInTheDocument(),
    );
  });
});

describe("unread badge on My Groups", () => {
  it(
    "increments while the room isn't active, then clears once you open it",
    async () => {
      renderApp();
      await join("UnreadBadgeUser");

      fireEvent.click(screen.getByText("Groups"));
      await joinGroupFromDiscover("Monkey Business");

      // Open a private chat instead, and send there — this should NOT bump
      // the group's unread count.
      fireEvent.click(screen.getByText("Users"));
      fireEvent.click(screen.getByText("Nara"));
      fireEvent.change(screen.getByPlaceholderText("Type a message…"), {
        target: { value: "hi" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));

      fireEvent.click(screen.getByText("Groups"));
      expect(screen.queryByText("(1)")).not.toBeInTheDocument();

      // Someone else posts into Monkey Business while it isn't the active
      // room — there's no auto-reply bot in the real app (backend/API.md §5),
      // so this simulates a second real client via the fake API directly.
      fakeApi.__injectMessage("group:g-monkey-business", {
        senderId: "c-nara",
        senderName: "Nara",
        text: "anyone around?",
      });

      // Unread counts only refresh on the periodic poll (~10s, see
      // useChatStore's UNREAD_POLL_INTERVAL_MS) — wait for a real tick.
      await waitFor(
        () => {
          fireEvent.click(screen.getByText("Groups"));
          expect(screen.getByText("(1)")).toBeInTheDocument();
        },
        { timeout: 12_000, interval: 500 },
      );

      // Opening the room clears the badge immediately (optimistic local
      // reset), no poll wait needed.
      fireEvent.click(screen.getAllByText("Monkey Business")[0]);
      fireEvent.click(screen.getByText("Groups"));
      expect(screen.queryByText("(1)")).not.toBeInTheDocument();
    },
    15_000,
  );
});
