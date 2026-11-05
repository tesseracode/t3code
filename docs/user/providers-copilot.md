# GitHub Copilot

Enable **GitHub Copilot** in **Settings > Providers** on the environment running
your project. It uses the native Copilot SDK and your existing Copilot account,
not the ACP registry or a separately billed hosted model service.

Sign in on that environment with `copilot login`, then refresh provider status.
Models and reasoning options come from your account's available catalog.

When **Auto** is available in your model catalog, you can select it to let Copilot
choose the model using its current routing preferences. Auto remains available
even when the account does not supply routing-preference details.

When your account advertises routing preferences, Auto's **Routing** option includes the
eligible preferences, including Fusion. Disabled preferences show their account-specific reason.
Requests can remain pending before they take effect; the activity log distinguishes requested,
effective, and activating routing and shows reported model phases and timing. See
[Activity log](activity-log.md). Explicit-model selection and defaults are unchanged.

To opt in to dynamic Fusion tiers, turn on **Enable Fusion** for this provider in
**Settings > Providers**. The setting is off by default on each environment.
Changing an explicit routing preference renews the Copilot runtime and resumes
the same native conversation, so existing chats receive the updated setting.
When the account advertises Fusion, the model
picker shows **Fusion**, with a separate **Fusion effort** control for its available
tiers, such as **Standard**, **High**, and **Max**. Names and availability come from
your account; choosing an effort does not pin the solver or reviewer model.

Choose **Provider default** in the effort control to explicitly clear a saved
preference. Omitting a preference on reconnect instead restores the committed
selection. A change may remain pending until the next turn.

Background generation, including titles and source-control text, honors the
selected account-advertised routing preference. Unavailable preferences fail
explicitly rather than silently using a different tier.

Fusion can use one model or multiple draft/review phases. The activity log shows
reported phases and the final source model, while chat shows the committed final
answer rather than intermediate drafts. Fusion-enabled Auto answers appear as full
responses; ordinary model streaming remains available.

The default runtime uses the bundled Copilot executable. **Binary path** can
override it. **COPILOT_HOME path** selects the account's configuration and native
session directory; separate provider instances can use separate directories.
Configuration, credentials, and sessions stay on the environment, including when
you connect from the web app, desktop, or mobile.

## Project configuration and skills

**Discover project configuration** loads the project's native MCP servers,
instructions, and skills. The skill picker uses the current project's discovered
skills, not a combined list from unrelated projects. Disabled and agent-only
skills are not offered as user commands.
Enabling or disabling skills during an active session is not exposed by this
integration.

## Conversations and permissions

Native conversations resume after reconnecting. If another client already owns a
native session, T3 Code refuses to take it over. Close that client before retrying.
Older imported conversations may continue in a fresh native session.

Plan mode uses Copilot's native planning flow. Tool approvals and questions appear
in the thread. Restricted modes ask before tools run; **Auto-accept edits** allows
file changes, and **Full access** allows tool requests without prompting.
Only one-time approval is offered; Copilot's account-wide permission rules remain
under its own control.

Permission answers wait for the native runtime to acknowledge applying the
decision. An unconfirmed answer is not proof that the tool did not run; do not
repeat the action automatically.

Model/tool steps and subagent activity do not end your submitted turn: the root
native session must become idle. Background tasks remain visible independently.
Automatic native compaction is shown in the thread. Explicit manual compaction,
native conversation rollback, and native forks are not exposed by this integration;
portable handoffs remain available.
