import { createFileRoute } from "@tanstack/react-router";
import { AttentionInbox } from "../components/attention/AttentionInbox";

export const Route = createFileRoute("/_chat/attention")({
  component: AttentionInbox,
});
