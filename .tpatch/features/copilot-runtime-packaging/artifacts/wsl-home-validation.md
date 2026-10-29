# WSL account-home probe correction

Receiving-host preview 20261003.1 reported WSL available/enabled in both mode
but no secondary bootstrap: isolated startup could not resolve the Linux home.
A direct read-only `wsl.exe --exec id -u` / `getent passwd` lookup succeeded.
The existing home helper still sent nested quotes through `sh -c` on Windows
argv, unlike the other WSL probes that already use stdin scripts.

The correction reuses the bounded `runWslShell` helper with `resolveNode: false`:
`wsl.exe --exec sh -s`, numeric Linux account lookup, no inherited HOME or login
profile dependency. Failed commands, empty/relative/multiline paths are logged
and rejected. The preview isolation guard and positive-only cache remain intact.

Before the fix, the new transport cases and multiline-output regression failed.
After the fix, 84 focused cases pass across the home/environment, backend
configuration and folder-picker IPC tests; 14 existing capability skips remain.
The actual stdin script executes in a POSIX shell fixture, including an account
home with spaces and an intentionally incorrect inherited HOME. Scoped
desktop/scripts types and WSL lint pass.

This establishes the local source correction, not receiving-host qualification.
The updated Windows package still needs installation and a two-environment
registration/project-selection pass on the user's machine. Sidebar cookies and
window-menu/title-bar observations are separate and are not changed here.
