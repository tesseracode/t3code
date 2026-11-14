# Device reservation release investigation

Issue #43 records an installed-runtime reservation that survived a failed and
settled thread, hiding its Device tab, and archiving the thread. Explicitly
closing the original bound agent-device session released the simulator.

At base `0490e7bb2753ee455d58f9832f6ea943af81b0e0`,
`DeviceService.close` retires the selected thread's sessions and releases bound
automation launchers before pruning them. Existing tests cover ownership,
shutdown ordering, interrupted retirement, reopening, and shared host leases.
The focused release tests pass on this base.

`DevicePanel.closeActive(false)` only closes the surface. User documentation
explicitly calls this stopping watching, rather than ending automation. Therefore
tab hiding is not a failing reproduction of the service close path.

Automatic cleanup on any failed or completed turn would revoke legitimate
cross-turn ownership. Changing tab-close semantics would also change documented
behavior and needs a deliberate product decision. A separate explicit disconnect
control is the smallest potential UX change, but has not been authorized as a
replacement for the existing hide behavior.

Startup pruning removes old launcher directories without discovering their
automation claims. This is a separate potential orphaning path, not proof of the
observed incident's cause. Do not close historical or shared-host sessions based
solely on launcher presence.

The maintainer selected an explicit Disconnect action while retaining tab-hide
behavior. Expose the existing owner-scoped service close operation in both web
and mobile device controls. Do not introduce automatic thread retirement.
