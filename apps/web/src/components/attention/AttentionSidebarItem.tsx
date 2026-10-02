import { useAtomValue } from "@effect/atom-react";
import { useLocation } from "@tanstack/react-router";
import { InboxIcon } from "lucide-react";
import { attentionWorkspace } from "../../state/attention";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { attentionBadge } from "./attentionInbox.logic";
import { useOpenAttentionInbox } from "./useOpenAttentionInbox";

export function AttentionSidebarItem() {
  const aggregate = useAtomValue(attentionWorkspace.aggregateAtom);
  const badge = attentionBadge(aggregate);
  const active = useLocation({ select: (location) => location.pathname === "/attention" });
  const open = useOpenAttentionInbox();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem className="shrink-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuButton
              aria-label={`Attention inbox. ${badge.label}`}
              isActive={active}
              className="w-auto gap-1.5"
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                void open();
              }}
            >
              <InboxIcon />
              <span className="tabular-nums text-xs">{badge.text}</span>
            </SidebarMenuButton>
          }
        />
        <TooltipPopup side="top">Attention inbox: {badge.label}</TooltipPopup>
      </Tooltip>
    </SidebarMenuItem>
  );
}
