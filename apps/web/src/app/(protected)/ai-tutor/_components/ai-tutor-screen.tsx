"use client";

import { MessageCircleMore, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { AiTutorWorkspaceSnapshot } from "../_types/ai-tutor-ui-state";

import {
  deleteMockTutorConversation,
  getMockTutorErrorMessage,
  getMockTutorConversationHistory,
} from "../_mocks/ai-tutor-mock-api";
import { ConversationChat } from "./conversation-chat";
import { ConversationCreateForm } from "./conversation-create-form";
import { ConversationHistory } from "./conversation-history";

type AiTutorScreenProps = {
  workspace: AiTutorWorkspaceSnapshot;
};

function WorkspaceSidebar({
  conversations,
  selectedConversationId,
}: {
  conversations: AiTutorWorkspaceSnapshot["conversations"];
  selectedConversationId: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-secondary-background">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b-4 border-border px-5">
        <span className="flex size-9 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
          <MessageCircleMore aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading">AI Tutor</p>
          <p className="text-xs text-foreground/65">Mock workspace</p>
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
        items={conversations.items}
        key={selectedConversationId ?? "new-conversation"}
        loadMore={getMockTutorConversationHistory}
        selectedConversationId={selectedConversationId}
      />
    </div>
  );
}

function ConversationHistorySheet({
  conversations,
  selectedConversationId,
}: {
  conversations: AiTutorWorkspaceSnapshot["conversations"];
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
          selectedConversationId={selectedConversationId}
        />
      </SheetContent>
    </Sheet>
  );
}

export function AiTutorScreen({ workspace }: AiTutorScreenProps) {
  const [workspaceState, setWorkspaceState] = useState(workspace);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedConversation = workspaceState.selectedConversation;

  async function handleDeleteConversation(conversationId: string) {
    await deleteMockTutorConversation(conversationId);
    const isSelectedConversation =
      workspaceState.selectedConversation?.conversation_id === conversationId;

    setWorkspaceState((currentWorkspace) => {
      const items = currentWorkspace.conversations.items.filter(
        (item) => item.conversation_id !== conversationId,
      );

      return {
        conversations: {
          ...currentWorkspace.conversations,
          items,
          total_items: items.length,
          total_pages: Math.max(
            1,
            Math.ceil(items.length / currentWorkspace.conversations.page_size),
          ),
        },
        selectedConversation: isSelectedConversation ? null : currentWorkspace.selectedConversation,
      };
    });

    if (isSelectedConversation) {
      window.history.replaceState(null, "", "/ai-tutor");
    }
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (open || isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(false);
    window.requestAnimationFrame(() => deleteButtonRef.current?.focus());
  }

  async function handleDeleteConfirm() {
    if (!selectedConversation || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await handleDeleteConversation(selectedConversation.conversation_id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Could not delete conversation", {
        description: getMockTutorErrorMessage(error),
      });
      setIsDeleteDialogOpen(false);
      window.requestAnimationFrame(() => deleteButtonRef.current?.focus());
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="h-[calc(100dvh-70px)] min-h-[560px] overflow-hidden bg-background">
      <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r-4 border-border lg:block">
          <WorkspaceSidebar
            conversations={workspaceState.conversations}
            selectedConversationId={selectedConversation?.conversation_id ?? null}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col" aria-label="AI Tutor workspace">
          {selectedConversation ? (
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-4 border-border bg-secondary-background px-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <ConversationHistorySheet
                    conversations={workspaceState.conversations}
                    selectedConversationId={selectedConversation.conversation_id}
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-heading">
                    {selectedConversation?.topic ?? "New conversation"}
                  </p>
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
            <div
              className={
                selectedConversation
                  ? "h-full min-h-0"
                  : "scrollbar h-full overflow-x-hidden overflow-y-auto"
              }
            >
              {selectedConversation ? (
                <ConversationChat
                  conversation={selectedConversation}
                  key={selectedConversation.conversation_id}
                />
              ) : (
                <div className="flex min-h-[calc(100dvh-70px)] items-center justify-center p-5 sm:p-8">
                  <div className="w-full max-w-[680px]">
                    <div className="mb-4 flex justify-end lg:hidden">
                      <ConversationHistorySheet
                        conversations={workspaceState.conversations}
                        selectedConversationId={null}
                      />
                    </div>
                    <ConversationCreateForm />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Dialog onOpenChange={handleDeleteDialogOpenChange} open={isDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete conversation?</DialogTitle>
                <DialogDescription>
                  This permanently removes “{selectedConversation?.topic ?? "this conversation"}”
                  and all of its messages.
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
                  {isDeleting ? "Deleting…" : "Delete conversation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  );
}
