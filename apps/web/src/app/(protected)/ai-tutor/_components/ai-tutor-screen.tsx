"use client";

import type {
  TutorConversationCreateRequest,
  TutorConversationCreateResponse,
  TutorConversationDetailResponse,
  TutorConversationListResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
} from "@kaiwa-app/api-client";
import type { ReactNode } from "react";

import { LoaderCircle, MessageCircleMore, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ConversationChat } from "./conversation-chat";
import { ConversationCreateForm } from "./conversation-create-form";
import { ConversationHistory } from "./conversation-history";

export type AiTutorListState = "loading" | "ready" | "error";
export type AiTutorDetailState = "new" | "loading" | "ready" | "unavailable" | "error";

type AiTutorScreenProps = {
  conversations: TutorConversationListResponse | null;
  createRetryAttempt: number;
  deleteRetryAttempt: number;
  detailErrorMessage?: string;
  detailRetryAttempt: number;
  detailState: AiTutorDetailState;
  listErrorMessage?: string;
  listRetryAttempt: number;
  listState: AiTutorListState;
  loadPage: (page: number) => Promise<TutorConversationListResponse>;
  onCreateConversation: (
    request: TutorConversationCreateRequest,
  ) => Promise<TutorConversationCreateResponse>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onSendMessage: (
    conversationId: string,
    request: TutorMessageCreateRequest,
  ) => Promise<TutorMessageCreateResponse>;
  onRetryDetail: () => void;
  onRetryList: () => void;
  selectedConversation: TutorConversationDetailResponse | null;
};

function WorkspaceSidebar({
  conversations,
  listErrorMessage,
  listRetryAttempt,
  listState,
  loadPage,
  onRetryList,
  selectedConversationId,
}: {
  conversations: TutorConversationListResponse | null;
  listErrorMessage?: string;
  listRetryAttempt: number;
  listState: AiTutorListState;
  loadPage: (page: number) => Promise<TutorConversationListResponse>;
  onRetryList: () => void;
  selectedConversationId: string | null;
}) {
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

function ConversationHistorySheet({
  conversations,
  listErrorMessage,
  listRetryAttempt,
  listState,
  loadPage,
  onRetryList,
  selectedConversationId,
}: {
  conversations: TutorConversationListResponse | null;
  listErrorMessage?: string;
  listRetryAttempt: number;
  listState: AiTutorListState;
  loadPage: (page: number) => Promise<TutorConversationListResponse>;
  onRetryList: () => void;
  selectedConversationId: string | null;
}) {
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
        <WorkspaceSidebar
          conversations={conversations}
          listErrorMessage={listErrorMessage}
          listState={listState}
          listRetryAttempt={listRetryAttempt}
          loadPage={loadPage}
          onRetryList={onRetryList}
          selectedConversationId={selectedConversationId}
        />
      </SheetContent>
    </Sheet>
  );
}

function WorkspaceStateFrame({
  children,
  conversations,
  listErrorMessage,
  listRetryAttempt,
  listState,
  loadPage,
  onRetryList,
}: {
  children: ReactNode;
  conversations: TutorConversationListResponse | null;
  listErrorMessage?: string;
  listRetryAttempt: number;
  listState: AiTutorListState;
  loadPage: (page: number) => Promise<TutorConversationListResponse>;
  onRetryList: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-70px)] flex-col items-center justify-center p-5 sm:p-8">
      <div className="mb-4 flex w-full justify-end lg:hidden">
        <ConversationHistorySheet
          conversations={conversations}
          listErrorMessage={listErrorMessage}
          listState={listState}
          listRetryAttempt={listRetryAttempt}
          loadPage={loadPage}
          onRetryList={onRetryList}
          selectedConversationId={null}
        />
      </div>
      {children}
    </div>
  );
}

function DetailLoadingState({ retryAttempt }: { retryAttempt: number }) {
  return (
    <div
      aria-busy="true"
      className="flex w-full max-w-[680px] flex-col items-center justify-center gap-3 text-center"
    >
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin" />
      <p className="font-heading" role="status">
        {retryAttempt > 0
          ? `Retrying conversation, attempt ${retryAttempt + 1}…`
          : "Loading conversation…"}
      </p>
    </div>
  );
}

function DetailUnavailableState({
  detailErrorMessage,
  isUnavailable,
  onRetry,
}: {
  detailErrorMessage?: string;
  isUnavailable: boolean;
  onRetry: () => void;
}) {
  return (
    <ProtectedRouteStatusPanel
      action={
        <div className="flex flex-wrap justify-center gap-3">
          {!isUnavailable ? <Button onClick={onRetry}>Try again</Button> : null}
          <Button asChild variant="neutral">
            <Link href="/ai-tutor">Back to conversations</Link>
          </Button>
        </div>
      }
      description={
        isUnavailable
          ? "This conversation is no longer available or you do not have access to it."
          : (detailErrorMessage ?? "We could not load this conversation. Try again.")
      }
      title="Conversation unavailable"
      variant="error"
    />
  );
}

export function AiTutorScreen({
  conversations,
  createRetryAttempt,
  deleteRetryAttempt,
  detailErrorMessage,
  detailRetryAttempt,
  detailState,
  listErrorMessage,
  listRetryAttempt,
  listState,
  loadPage,
  onCreateConversation,
  onDeleteConversation,
  onSendMessage,
  onRetryDetail,
  onRetryList,
  selectedConversation,
}: AiTutorScreenProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasConversation = detailState === "ready" && selectedConversation !== null;

  function handleDeleteDialogOpenChange(open: boolean) {
    if (isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(open);
    if (!open) {
      window.requestAnimationFrame(() => deleteButtonRef.current?.focus());
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedConversation || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteConversation(selectedConversation.conversation_id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Could not delete conversation", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="h-[calc(100dvh-70px)] min-h-[560px] overflow-hidden bg-background">
      <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r-4 border-border lg:block">
          <WorkspaceSidebar
            conversations={conversations}
            listErrorMessage={listErrorMessage}
            listRetryAttempt={listRetryAttempt}
            listState={listState}
            loadPage={loadPage}
            onRetryList={onRetryList}
            selectedConversationId={selectedConversation?.conversation_id ?? null}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col" aria-label="AI Tutor workspace">
          {hasConversation ? (
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-4 border-border bg-secondary-background px-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <ConversationHistorySheet
                    conversations={conversations}
                    listErrorMessage={listErrorMessage}
                    listRetryAttempt={listRetryAttempt}
                    listState={listState}
                    loadPage={loadPage}
                    onRetryList={onRetryList}
                    selectedConversationId={selectedConversation.conversation_id}
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-heading">{selectedConversation.topic}</p>
                  <div className="flex min-w-0 items-center gap-2 text-xs text-foreground/65">
                    <span className="shrink-0 font-heading">{selectedConversation.difficulty}</span>
                    {selectedConversation.scenario ? (
                      <span className="truncate" title={selectedConversation.scenario}>
                        · {selectedConversation.scenario}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label={`Delete conversation ${selectedConversation.topic}`}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  ref={deleteButtonRef}
                  size="icon"
                  variant="neutral"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </header>
          ) : null}

          <div className="min-h-0 flex-1">
            <div className={hasConversation ? "h-full min-h-0" : "h-full overflow-y-auto"}>
              {hasConversation ? (
                <ConversationChat
                  conversation={selectedConversation}
                  key={selectedConversation.conversation_id}
                  onSendMessage={onSendMessage}
                />
              ) : detailState === "loading" ? (
                <WorkspaceStateFrame
                  conversations={conversations}
                  listErrorMessage={listErrorMessage}
                  listRetryAttempt={listRetryAttempt}
                  listState={listState}
                  loadPage={loadPage}
                  onRetryList={onRetryList}
                >
                  <DetailLoadingState retryAttempt={detailRetryAttempt} />
                </WorkspaceStateFrame>
              ) : detailState === "new" ? (
                <WorkspaceStateFrame
                  conversations={conversations}
                  listErrorMessage={listErrorMessage}
                  listRetryAttempt={listRetryAttempt}
                  listState={listState}
                  loadPage={loadPage}
                  onRetryList={onRetryList}
                >
                  <ConversationCreateForm
                    onCreate={onCreateConversation}
                    retryAttempt={createRetryAttempt}
                  />
                </WorkspaceStateFrame>
              ) : (
                <WorkspaceStateFrame
                  conversations={conversations}
                  listErrorMessage={listErrorMessage}
                  listRetryAttempt={listRetryAttempt}
                  listState={listState}
                  loadPage={loadPage}
                  onRetryList={onRetryList}
                >
                  <DetailUnavailableState
                    detailErrorMessage={detailErrorMessage}
                    isUnavailable={detailState === "unavailable"}
                    onRetry={onRetryDetail}
                  />
                </WorkspaceStateFrame>
              )}
            </div>
          </div>

          <Dialog onOpenChange={handleDeleteDialogOpenChange} open={isDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete conversation?</DialogTitle>
                <DialogDescription>
                  This removes “{selectedConversation?.topic ?? "this conversation"}” from your
                  conversation history.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button disabled={isDeleting} type="button" variant="neutral">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="border-border bg-destructive text-destructive-foreground"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteConfirm()}
                  type="button"
                  variant="neutral"
                >
                  {isDeleting
                    ? deleteRetryAttempt > 0
                      ? "Retrying delete…"
                      : "Deleting…"
                    : "Delete conversation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  );
}
