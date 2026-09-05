"use client";

import type {
  TutorConversationCreateRequest,
  TutorConversationCreateResponse,
  TutorConversationDetailResponse,
  TutorConversationListResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
} from "@kaiwa-app/api-client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

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

import type { AiTutorDetailState, AiTutorListState } from "../_types/ai-tutor-screen";

export type { AiTutorDetailState, AiTutorListState } from "../_types/ai-tutor-screen";

import {
  AiTutorConversationHistorySheet,
  AiTutorConversationSidebar,
} from "./ai-tutor-conversation-navigation";
import {
  AiTutorDetailLoadingState,
  AiTutorDetailUnavailableState,
  AiTutorWorkspaceStateFrame,
} from "./ai-tutor-workspace-states";
import { ConversationChat } from "./conversation-chat";
import { ConversationCreateForm } from "./conversation-create-form";

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

  const navigationProps = {
    conversations,
    listErrorMessage,
    listRetryAttempt,
    listState,
    loadPage,
    onRetryList,
  };

  return (
    <main className="h-[calc(100dvh-70px)] min-h-[560px] overflow-hidden bg-background">
      <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r-4 border-border lg:block">
          <AiTutorConversationSidebar
            {...navigationProps}
            selectedConversationId={selectedConversation?.conversation_id ?? null}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col" aria-label="AI Tutor workspace">
          {hasConversation ? (
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-4 border-border bg-secondary-background px-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <AiTutorConversationHistorySheet
                    {...navigationProps}
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
                <AiTutorWorkspaceStateFrame {...navigationProps}>
                  <AiTutorDetailLoadingState retryAttempt={detailRetryAttempt} />
                </AiTutorWorkspaceStateFrame>
              ) : detailState === "new" ? (
                <AiTutorWorkspaceStateFrame {...navigationProps}>
                  <ConversationCreateForm
                    onCreate={onCreateConversation}
                    retryAttempt={createRetryAttempt}
                  />
                </AiTutorWorkspaceStateFrame>
              ) : (
                <AiTutorWorkspaceStateFrame {...navigationProps}>
                  <AiTutorDetailUnavailableState
                    detailErrorMessage={detailErrorMessage}
                    isUnavailable={detailState === "unavailable"}
                    onRetry={onRetryDetail}
                  />
                </AiTutorWorkspaceStateFrame>
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
