# Optional TWS integration

T3 Code does not require Tesseraworkspaces (TWS). The integration is **off by
default**, separately for each environment.

Open **Settings → Integrations → TWS integration** to enable an environment.
That environment must have TWS **v1.2.14** installed. This version supports
macOS and Linux; on Windows, use a WSL environment for TWS-backed work. The
Windows T3 Code app and native Windows environments remain usable without TWS.

When enabled, T3 reads TWS's public status and registry reports. **Refresh**
requests a new observation. Opening the integration view, reconnecting, and
changing a T3 execution location also request refreshes. There is no periodic
polling or real-time watching.

Disabling the integration cancels its refresh work and bypasses TWS for normal
project and thread behavior. Saved bindings and explicit context choices are
retained but inactive. Re-enabling requires a fresh observation before cached
associations can be used.

## Conservative context

TWS context distinguishes a logical workspace/feature from the execution node
currently proved by the environment's checkout and branch. Sharing a repository
or project is not enough to assign a feature.

Failed or incomplete reports retain last-known context as stale. Ambiguous,
archived, unmaterialized and unsupported cross-repository nodes are not guessed.
A changed checkout invalidates node evidence without rewriting an explicit
logical feature choice. Unproved feature or node renames require reassignment.

The context API supports explicit set/reassign, clear, and return to automatic
association. Clear remains an opt-out until automatic association is explicitly
restored. These choices change only T3 context: they do not move checkouts,
change branches, select agents or modify TWS.

The integration supplies context for later workspace grouping and tag surfaces.
TWS's reported agent state is not used as coding-agent activity or attention.
