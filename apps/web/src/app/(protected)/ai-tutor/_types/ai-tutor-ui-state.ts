import type {
  TutorConversationDetailResponse,
  TutorConversationListResponse,
} from "@kaiwa-app/api-client";

export type AiTutorWorkspaceSnapshot = {
  conversations: TutorConversationListResponse;
  selectedConversation: TutorConversationDetailResponse | null;
};
