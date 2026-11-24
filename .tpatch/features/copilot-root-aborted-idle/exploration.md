# Exploration

The root/child ownership gate precedes the adapter event switch. Extend the
existing root session-idle branch with a guarded aborted assistant-idle case,
setting interrupted before terminal evaluation. Keep refreshTasks and terminal
unchanged. Native-ingress supervision already surrounds this event consumer.

The existing completion-boundary test can assert aborted child idle is ignored.
Parameterize the existing resumed-identity interruption test over session.idle
and assistant.idle, with an attached running shell retained after abort.
Apply the test portion first and preserve its actual failing assertion.

The documentation describes attached shells and Stop independently. Shared
adapter behavior applies to web, desktop, mobile, agent tools and connection
modes without new UI, RPC, provider selection or permissions changes.
Other providers are unchanged.
