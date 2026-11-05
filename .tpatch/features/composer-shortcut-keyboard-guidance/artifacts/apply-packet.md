# Apply Packet: composer-shortcut-keyboard-guidance

## Request
# Feature Request: Correct keyboard shortcut guidance after upstream software-keyboard detection superseded the old narrow-window submission guard. Explain that physical-keyboard send preferences apply at any web/desktop width, while an open software keyboard keeps plain Enter as a newline. Resolve issue #18 without introducing a redundant override setting.

**Slug**: `composer-shortcut-keyboard-guidance`
**Created**: 2026-11-05T18:33:31Z

## Description

Correct keyboard shortcut guidance after upstream software-keyboard detection superseded the old narrow-window submission guard. Explain that physical-keyboard send preferences apply at any web/desktop width, while an open software keyboard keeps plain Enter as a newline. Resolve issue #18 without introducing a redundant override setting.


## Spec
# Acceptance

- Say that configured web/desktop shortcuts also work in narrow windows.
- Explain that plain Enter remains a newline with an open software keyboard.
- Do not add a setting or change native mobile, queue, steer, or server behavior.


## Exploration
# Scope

Replace the outdated desktop-width sentence in `docs/user/keybindings.md`.
Existing composer and software-keyboard tests and the isolated Replay client
provide the behavior evidence; documentation-only edits require no new tests.

