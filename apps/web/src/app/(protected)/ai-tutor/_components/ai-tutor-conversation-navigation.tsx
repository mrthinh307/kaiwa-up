"use client";

import type { TutorConversationListResponse } from "@kaiwa-app/api-client";

import { MessageCircleMore, PanelLeftOpen, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { AiTutorListState } from "../_types/ai-tutor-screen";

import { ConversationHistory } from "./conversation-history";

export type AiTutorConversationNavigationProps = {
  conversations: TutorConversationListResponse | null;
  listErrorMessage?: string;
  listRetryAttempt: number;
  listState: AiTutorListState;
  loadPage: (page: number) => Promise<TutorConversationListResponse>;
  onRetryList: () => void;
  selectedConversationId: string | null;
};

export function AiTutorConversationSidebar({
  conversations,
  listErrorMessage,
  listRetryAttempt,
  listState,
  loadPage,
  onRetryList,
  selectedConversationId,
}: AiTutorConversationNavigationProps) {
  const items = conversations?.items ?? [];
  const historyState =
    listState === "loading"
      ? "loading"
      : listState === "error"
        ? "error"
        : items.length > 0
          ? "ready"
          : "empty";

  return (
    <div className="flex h-full min-h-0 flex-col bg-secondary-background">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b-4 border-border px-5">
        <span className="flex size-9 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
          <MessageCircleMore aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading">AI Tutor</p>
          <p className="text-xs text-foreground/65">Conversation history</p>
        </div>
      </div>

      <div className="shrink-0 border-b-2 border-border p-4">
        <Button asChild className="w-full justify-start" variant="neutral">
          <Link href="/ai-tutor">
            <Plus aria-hidden="true" />
            New conversation
          </Link>
        </Button>
      </div>

      <ConversationHistory
        errorMessage={listErrorMessage}
        items={items}
        key={`${listState}:${items[0]?.conversation_id ?? "empty"}:${conversations?.total_items ?? 0}`}
        loadPage={listState === "ready" ? loadPage : undefined}
        onRetry={onRetryList}
        page={conversations?.page ?? 1}
        retryAttempt={listRetryAttempt}
        selectedConversationId={selectedConversationId}
        state={historyState}
        totalPages={conversations?.total_pages ?? 0}
      />
    </div>
  );
}

export function AiTutorConversationHistorySheet(props: AiTutorConversationNavigationProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Open conversation history" size="icon" variant="neutral">
          <PanelLeftOpen aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 p-0" side="left">
        <SheetHeader className="sr-only">
          <SheetTitle>AI Tutor conversations</SheetTitle>
          <SheetDescription>Browse your conversations or create a new one.</SheetDescription>
        </SheetHeader>
        <AiTutorConversationSidebar {...props} />
      </SheetContent>
    </Sheet>
  );
}
