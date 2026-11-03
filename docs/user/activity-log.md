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
