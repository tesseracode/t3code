# Feature Request: Restore predictable Windows desktop menu access and title-bar dragging without obstructing chat controls.

**Slug**: `windows-titlebar-menu`
**Created**: 2026-10-03T06:02:00Z

## Description

Restore discoverable Windows desktop menu access and predictable dragging of
the main window without blocking interactive header/chat controls.

## Status and baseline

Requested only, not implemented. Branch `request/windows-titlebar-menu` starts
from shipped preview source `bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be`.
Research and request registration do not advance the tpatch lifecycle.
Canonical backlog: #1. Related receiving-host context: #17.

## Observed problem and existing implementation

The receiving Windows host reports that pressing Alt does not reveal a menu,
and the window can only be dragged from the T3 branding/artwork section.
Ctrl+Shift+I did open Developer Tools. The suggestion that chat overlaps the
native menu is a hypothesis, not an established root cause.

- `apps/desktop/src/window/DesktopWindow.ts:253-274,397-408` combines the
  non-macOS hidden title bar / title-bar overlay with autoHideMenuBar.
- `apps/desktop/src/window/DesktopApplicationMenu.ts:230-254` declares View
  and the native toggleDevTools menu role.
- `apps/web/src/components/sidebar/SidebarChrome.tsx:59-76` marks the sidebar
  header as an Electron drag region; inspect the rest of the shared top bar,
  title-bar insets and no-drag controls before attributing the problem.

## Requested outcome

- Provide a discoverable mouse and keyboard path to File/Edit/View actions.
  Decide whether native Alt/menu access can work with the existing title bar
  or a small explicit menu affordance is necessary after Windows reproduction.
- Make blank, intended header areas draggable. Buttons, inputs, breadcrumbs,
  menus, native window controls and embedded previews must remain interactive.
- Preserve maximize/restore, double-click behavior, snap layouts, keyboard
  focus and accessibility names. Keep native title-bar controls unobstructed.
- Cover empty first-project state, populated chat, Settings, maximized and
  restored windows, DPI scaling, light/dark themes and compact/wide layouts.
- Avoid global key interception, arbitrary z-index fixes, new window chrome
  frameworks, continuous animation or a special case tied to one provider.
- Windows is the primary affected surface. Shared web header changes need
  browser/macOS/Linux desktop regression decisions; native mobile is not
  expected to need an OS-menu change.

## Evidence needed before implementation

Reproduce on the packaged Windows build and inspect menu creation/visibility,
Electron title-bar configuration and actual drag/no-drag hit regions. Capture
before/after evidence only in an approved owned environment. Do not conclude
that changing autoHideMenuBar alone repairs the complete behavior.

Keep sidebar CookieStore persistence failures, chat width, custom artwork,
provider lifecycle and WSL registration out of this feature unless a concrete
causal dependency is demonstrated. No runtime patch, packaging rebuild, CI
run, live-profile change, PR or release is authorized by this registration.
