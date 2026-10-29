import { useNavigate } from "@tanstack/react-router";
import { toastManager } from "../ui/toast";
import { ATTENTION_INBOX_ROUTE } from "./attentionInbox.logic";

export function useOpenAttentionInbox() {
  const navigate = useNavigate();
  return async () => {
    try {
      await navigate(ATTENTION_INBOX_ROUTE);
    } catch (error) {
      console.error("Could not open attention inbox.", error);
      toastManager.add({ type: "error", title: "Could not open attention inbox" });
    }
  };
}
