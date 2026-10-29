# GitHub Copilot

Enable **GitHub Copilot** in **Settings > Providers** on the environment running
your project. It uses the native Copilot SDK and your existing Copilot account,
not the ACP registry or a separately billed hosted model service.

Sign in on that environment with `copilot login`, then refresh provider status.
Models and reasoning options come from your account's available catalog.

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
