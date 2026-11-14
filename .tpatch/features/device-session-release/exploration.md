# Boundary

`DeviceService.close` already retires thread-scoped sessions and releases their
launchers under the ownership lock. Web's DevicePanel can call its existing
guarded close command with shutdown false. DeviceControlsRail exposes actions
through DeviceWorkspace. Mobile DevicePreviewScreen has the same shared guarded
command available and needs a distinct menu action.

Keep hiding and navigation separate. On mobile, existing observation closes a
focused preview once it has no sessions; when other previews remain, it selects
one of those. Errors use the existing command-result reporting patterns.
