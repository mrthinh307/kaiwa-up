"use client";

import type { TutorConversationListItem } from "@kaiwa-app/api-client";
import type { UIEvent } from "react";

import { History, LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConversationHistoryProps = {
  items: TutorConversationListItem[];
  loadMore?: (offset: number) => Promise<TutorConversationListItem[]>;
  selectedConversationId: string | null;
  state?: "ready" | "empty" | "error";
};

function ConversationHistoryEmpty() {
  return (
    <div className="px-3 py-4">
      <p className="text-sm font-heading">No conversations yet</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/65">
        Start a new conversation to begin practicing.
      </p>
    </div>
  );
}

function ConversationHistoryError() {
  return (
    <div className="mx-2 mt-2 rounded-base border-2 border-destructive bg-background p-3">
      <p className="text-sm font-heading text-destructive">History unavailable</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/65">
        We could not load your conversations.
      </p>
      <Button className="mt-4 w-full" onClick={() => window.location.reload()} variant="neutral">
        <RefreshCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

export function ConversationHistory({
  items,
  loadMore,
  selectedConversationId,
  state = "ready",
}: ConversationHistoryProps) {
  const [historyItems, setHistoryItems] = useState(items);
  const historyItemsRef = useRef(items);
  const [hasMore, setHasMore] = useState(Boolean(loadMore));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const loadMoreItems = useCallback(async () => {
    if (!loadMore || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(false);

    try {
      const nextItems = await loadMore(historyItemsRef.current.length);
      const existingIds = new Set(historyItemsRef.current.map((item) => item.conversation_id));
      const uniqueItems = nextItems.filter((item) => !existingIds.has(item.conversation_id));

      if (uniqueItems.length === 0) {
        setHasMore(false);
        return;
      }

      const nextHistoryItems = [...historyItemsRef.current, ...uniqueItems];
      historyItemsRef.current = nextHistoryItems;
      setHistoryItems(nextHistoryItems);
    } catch {
      setLoadMoreError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const handleHistoryScroll = (event: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) <= 32;

    if (isNearBottom) {
      void loadMoreItems();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-5 pt-4 text-sm font-heading">
        <History aria-hidden="true" className="size-4" />
        Conversation history
      </div>

      <div
        aria-busy={isLoadingMore}
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
        onScroll={handleHistoryScroll}
      >
        {state === "error" ? <ConversationHistoryError /> : null}
        {state === "empty" ? <ConversationHistoryEmpty /> : null}
        {state === "ready" && historyItems.length > 0 ? (
          <div className="space-y-0.5">
            {historyItems.map((conversation) => {
              const isSelected = conversation.conversation_id === selectedConversationId;

              return (
                <Link
                  aria-current={isSelected ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-3 rounded-base px-3 py-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isSelected ? "bg-main font-heading text-main-foreground" : "hover:bg-main/30",
                  )}
                  href={`/ai-tutor/${conversation.conversation_id}`}
                  key={conversation.conversation_id}
                  title={conversation.topic}
                >
                  <span className="min-w-0 truncate">{conversation.topic}</span>
                  <span className="shrink-0 text-xs font-heading opacity-70">
                    {conversation.difficulty}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}

        {loadMore ? (
          <div className="flex min-h-12 items-center justify-center px-3 py-3 text-xs text-foreground/60">
            {isLoadingMore ? (
              <span className="flex items-center gap-2" role="status">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Loading more conversations…
              </span>
            ) : null}
            {loadMoreError ? (
              <div className="flex w-full flex-col items-center gap-2 text-center">
                <span>Could not load more conversations.</span>
                <Button onClick={() => void loadMoreItems()} size="sm" variant="neutral">
                  <RefreshCw aria-hidden="true" />
                  Try again
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
