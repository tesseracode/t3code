# Acceptance

- Web/desktop and mobile device controls expose Disconnect device.
- Disconnect targets the selected environment, thread, host and device, without
  shutdown. Hide, float, tab close and ordinary turn completion retain behavior.
- Failed disconnect remains visible as an error instead of closing the view.
- Existing service owner-scoping, race, and shared-host release tests pass.
- Explain disconnect versus hiding in user documentation.
- Validate affected packages and the smallest integrated client flow feasible.
- Preserve native/remote host ownership; do not reclaim unrelated sessions.
