const SESSION_SEARCH_OPEN_EVENT = "t3code:open-session-search";

export function openSessionSearch(threadKey: string): boolean {
  const event = new CustomEvent(SESSION_SEARCH_OPEN_EVENT, { detail: threadKey, cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

export function onOpenSessionSearch(listener: (threadKey: string) => boolean): () => void {
  const handler = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      typeof event.detail === "string" &&
      listener(event.detail)
    ) {
      event.preventDefault();
    }
  };
  window.addEventListener(SESSION_SEARCH_OPEN_EVENT, handler);
  return () => window.removeEventListener(SESSION_SEARCH_OPEN_EVENT, handler);
}
