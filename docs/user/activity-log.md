# Activity log

On web and desktop, consecutive tool calls appear as an expandable summary. Open it to inspect
commands, tool inputs, status, and exit codes. Expand a tool call to see its output. A running
command's output updates live, and long output shows only its most recent part. Use **Open diff** on
a file change to review its contents.

T3 Orchestrator summaries describe the actions taken, such as **Ran 2 commands and sent messages
to 3 threads**. Repeated messages to the same destinations show both counts: **Sent 5 messages to
2 threads**. Thread creation counts the threads returned by the tool, including batches.

Groups with many kinds of activity show up to two specific action categories and a count of the
remaining actions. Commands, file changes, and orchestration changes take priority over reads and
status checks. Expand the group for the full list.

Failed calls do not count as successful messages or creations. Waiting on a thread does not mean
it finished, and an interrupt or cancellation request does not mean the thread stopped. When tool
details are unavailable, summaries use a broader description instead of guessing how many threads
were affected.

## Hide tool calls

**Tool calls in chat** in **Settings → Chat** (web and desktop) or **Settings → Appearance**
(mobile) hides commands, file edits, searches, and MCP tool calls
from the conversation. **Hide successful** shows a call while it runs and keeps
it only if it fails. **Hide all** hides every call and shows **Thinking** while the agent works.
**Zen** also hides the agent's in-between messages, so each turn shows your message
and the agent's last reply, which appears when the turn ends. If you steer while the agent is
answering, the answer it finished before reading your steer stays too. On web and desktop, Find
shows the in-between messages while it is open. Approvals, questions, and errors always show. The
setting applies to this browser or device only.

## Screen reader announcements

On web and desktop, a screen reader hears the open thread's turn as it runs. **Screen reader
announcements** in **Settings → Chat** sets how much. **Status only** says when a turn starts,
needs your approval or input, and ends. **Status and messages** also reads each message the agent
writes and then keeps working after, once that message is complete. A very long message is cut
short. The reply that closes the turn is not read, so you can read it yourself when you hear
**Done**. **Everything** adds the step the agent is on, such as the command it is running. Steps
are spaced out, so a quick step can be skipped for a newer one.
The agent's reasoning text is never read. The setting follows the agent's real activity, whatever
**Tool calls in chat** hides, and applies to this browser or device only.

To hear the open thread and what it's doing when you switch to T3 Code, turn on **Screen reader
window title** in the same section. The window title then starts with the thread's status
(**Working**, **Needs approval**, or **Needs your input**) and its name, then the project, so a
screen reader says them first. When the turn ends, only the status goes away.
Anyone who can see your taskbar, window switcher, or shared screen sees it too, and time trackers
that group by window title count each status separately.

When Copilot reports Fusion model activity, open a model phase or routing entry to inspect its
details on web, desktop, or mobile. Requested routing and planned work do not prove which model
executed. Phase details distinguish observed from estimated starts, provider elapsed time from
event and receipt timestamps, and show reported final models, fallback, failures, and telemetry
gaps. Missing timing or model data stays unknown rather than being inferred from the request.

Routing summaries include the reported Fusion execution pattern and final source model.
Planned fallback models are labeled separately: a fallback in the plan does not mean it ran.
Auto model-resolution entries show the selected model, not proof that it completed a response.
Events without a native turn association remain visibly unassociated; late routing and phase
events enrich existing activity rather than creating additional user turns.

For Copilot, enable **Fusion** in provider settings to opt in to its available tiers.
Select **Fusion** and its separate **Fusion effort** control when your connected account
advertises them. Available preferences come from that account; unavailable choices show their
reason. Without Fusion metadata, ordinary **Auto** routing remains available. Explicit models
and your default model are unchanged. Choose **Provider default** to clear a saved routing
preference, or switch back to an explicit model. A requested preference may be pending or
activating: the routing entry shows the confirmed effective preference separately, including
activation failures. Intermediate Fusion drafts are not final answers and stay out of chat.
