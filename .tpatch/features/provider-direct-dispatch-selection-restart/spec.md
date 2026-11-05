# Acceptance criteria

- An immediate same-provider message send honors an adapter-required session
  restart before inference, without requiring a separate selection command.
- Detach only the live replaced session, not a newer stopped record or peers.
- Preserve native conversation identity, message history, and restart credentials.
- Keep unchanged selections on the existing fast path and surface policy errors.
- Extend the existing persisted restart regression to cover both command paths.
- Verify concrete to Fusion Max and back through an isolated real client.
- Do not restart installed applications, change live profiles, deploy, or weaken
  account routing validation.
