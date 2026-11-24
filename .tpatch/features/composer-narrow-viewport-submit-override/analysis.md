# Resolution

The original request from `8a5dd4140` is preserved above without changing its
historical acceptance criteria. The current integration contains upstream commit
`34c5a6d4461ff7be2c1a059c3c51c3496c1e14df`
(`pingdotgg/t3code#21763`), which replaces the width-based Enter guard with
software-keyboard detection. Width now affects composer layout, not send intent.

At the integration baseline `021e6349cef1761698549ab3bd07f68a393dac5e`:

- Existing focused composer/software-keyboard tests pass: 69 tests in two files.
  They cover configured send shortcuts, modifier submission on Mac/Windows/Linux,
  software-keyboard newline protection, composition/repeat rejection, and native,
  viewport, zoom, rotation, and desktop keyboard-detection cases.
- Real isolated web client at exactly 639 CSS pixels: plain Enter submitted a
  completed Replay turn; Shift+Enter inserted a newline without dispatching;
  Cmd+Enter submitted that multiline draft.
- The existing Send shortcut preference was changed in Settings to require
  Cmd+Enter, persisted across navigation, prevented plain Enter from sending,
  and allowed Cmd+Enter to submit at 639 pixels and at 960 pixels.
- Restoring Enter immediately restored plain-Enter submission at 639 pixels.
- Cmd+Enter in a 639-pixel new draft created a completed background Replay thread
  and left the client on a fresh draft.
- All six submitted fixture runs completed, with no paid model calls or provider
  errors. No installed app or live profile was changed.

No new physical-device mobile verification is claimed. Mobile newline protection
is covered by the existing keyboard and submission tests, not by pretending that
resizing a browser creates a software keyboard.

The width override is superseded rather than implemented. Adding it now would
create a setting for a guard that no longer exists, or reintroduce obsolete
behavior. The user-facing keyboard guidance needs a small correction because it
still limits the send preference to desktop widths.
