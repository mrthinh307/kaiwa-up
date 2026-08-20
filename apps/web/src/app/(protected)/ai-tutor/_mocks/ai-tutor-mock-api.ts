import type {
  TutorConversationCreateRequest,
  TutorConversationCreateResponse,
  TutorConversationListItem,
  TutorMessageCreateRequest,
  TutorMessageResponse,
} from "@kaiwa-app/api-client";

import type { AiTutorWorkspaceSnapshot } from "../_types/ai-tutor-ui-state";

import {
  MOCK_TRAVEL_CONVERSATION_ID,
  MOCK_TUTOR_HISTORY_ITEMS,
  MOCK_TUTOR_CONVERSATIONS,
  MOCK_TUTOR_DETAILS,
} from "./ai-tutor-mock-data";

const MOCK_WORKSPACE_DELAY_MS = 450;
const MOCK_HISTORY_BATCH_SIZE = 2;
const MOCK_MESSAGE_ATTEMPTS = new Map<string, number>();
const MOCK_MESSAGE_RESPONSES = new Map<string, TutorMessageResponse>();

export type MockTutorErrorCode =
  | "forbidden"
  | "not_found"
  | "service_unavailable"
  | "tutor_message_idempotency_conflict"
  | "tutor_response_pending"
  | "unauthorized"
  | "validation_error";

const MOCK_TUTOR_ERROR_MESSAGES: Record<MockTutorErrorCode, string> = {
  forbidden: "You do not have permission to change this conversation.",
  not_found: "This conversation is no longer available. Return to conversation history.",
  service_unavailable: "AI Tutor is temporarily unavailable. Please try again.",
  tutor_message_idempotency_conflict:
    "This message was already submitted. Retry the existing turn instead of sending a new one.",
  tutor_response_pending: "AI Tutor is still processing the previous response. Please wait.",
  unauthorized: "Your session has expired. Refresh your session and try again.",
  validation_error: "Please check the conversation data and try again.",
};

export class MockTutorApiError extends Error {
  readonly code: MockTutorErrorCode;
  readonly status: number;

  constructor(code: MockTutorErrorCode) {
    super(MOCK_TUTOR_ERROR_MESSAGES[code]);
    this.code = code;
    this.status = {
      forbidden: 403,
      not_found: 404,
      service_unavailable: 503,
      tutor_message_idempotency_conflict: 409,
      tutor_response_pending: 409,
      unauthorized: 401,
      validation_error: 422,
    }[code];
    this.name = "MockTutorApiError";
  }
}

export function getMockTutorErrorMessage(error: unknown): string {
  return error instanceof MockTutorApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

function waitForMockResponse() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, MOCK_WORKSPACE_DELAY_MS);
  });
}

export async function getMockAiTutorWorkspace(
  selectedConversationId: string | null,
): Promise<AiTutorWorkspaceSnapshot> {
  await waitForMockResponse();

  const selectedConversation = selectedConversationId
    ? (MOCK_TUTOR_DETAILS[selectedConversationId] ??
      (() => {
        const historyItem = MOCK_TUTOR_HISTORY_ITEMS.find(
          (item) => item.conversation_id === selectedConversationId,
        );

        return historyItem
          ? {
              conversation_id: historyItem.conversation_id,
              topic: historyItem.topic,
              difficulty: historyItem.difficulty,
              scenario: historyItem.scenario,
              status: historyItem.status,
              started_at: historyItem.updated_at,
              ended_at: null,
              messages: [],
            }
          : null;
      })())
    : null;

  return {
    conversations: MOCK_TUTOR_CONVERSATIONS,
    selectedConversation,
  };
}

export async function getMockTutorConversationHistory(
  offset: number,
): Promise<TutorConversationListItem[]> {
  await waitForMockResponse();

  return MOCK_TUTOR_HISTORY_ITEMS.slice(offset, offset + MOCK_HISTORY_BATCH_SIZE);
}

export async function sendMockTutorMessage(
  request: TutorMessageCreateRequest,
  sequenceNumber: number,
): Promise<TutorMessageResponse> {
  const cachedResponse = MOCK_MESSAGE_RESPONSES.get(request.client_message_id);
  if (cachedResponse) {
    return cachedResponse;
  }

  await waitForMockResponse();

  const attempt = MOCK_MESSAGE_ATTEMPTS.get(request.client_message_id) ?? 0;
  const normalizedText = request.text.toLowerCase();
  const mockErrorCode: MockTutorErrorCode | null =
    normalizedText === "mock error"
      ? "service_unavailable"
      : normalizedText === "mock pending"
        ? "tutor_response_pending"
        : normalizedText === "mock conflict"
          ? "tutor_message_idempotency_conflict"
          : normalizedText === "mock invalid"
            ? "validation_error"
            : null;

  if (mockErrorCode && attempt === 0) {
    MOCK_MESSAGE_ATTEMPTS.set(request.client_message_id, attempt + 1);
    throw new MockTutorApiError(mockErrorCode);
  }

  const response: TutorMessageResponse = {
    id: globalThis.crypto.randomUUID(),
    sender: "ai",
    sequence_number: sequenceNumber,
    text: "ありがとうございます。もう少し詳しく教えてください。",
    text_vi: "Cảm ơn bạn. Hãy nói thêm một chút nhé.",
    client_message_id: null,
    created_at: new Date().toISOString(),
    feedback: null,
  };
  MOCK_MESSAGE_RESPONSES.set(request.client_message_id, response);
  return response;
}

export async function deleteMockTutorConversation(conversationId: string): Promise<void> {
  const mockDeleteErrorCodes: Record<string, MockTutorErrorCode> = {
    "mock-delete-401": "unauthorized",
    "mock-delete-403": "forbidden",
    "mock-delete-404": "not_found",
    "mock-delete-409-pending": "tutor_response_pending",
    "mock-delete-409-conflict": "tutor_message_idempotency_conflict",
    "mock-delete-422": "validation_error",
    "mock-delete-503": "service_unavailable",
  };
  const errorCode = mockDeleteErrorCodes[conversationId];

  await waitForMockResponse();

  if (errorCode) {
    throw new MockTutorApiError(errorCode);
  }
}

export async function createMockTutorConversation(
  request: TutorConversationCreateRequest,
): Promise<TutorConversationCreateResponse> {
  await waitForMockResponse();

  if (request.topic.toLowerCase() === "mock error") {
    throw new Error("Mock conversation creation failed");
  }

  const detail = MOCK_TUTOR_DETAILS[MOCK_TRAVEL_CONVERSATION_ID];

  if (!detail) {
    throw new Error("Mock conversation is unavailable");
  }

  const initialMessage = detail.messages?.[0];

  if (!initialMessage) {
    throw new Error("Mock opening message is unavailable");
  }

  return {
    conversation_id: detail.conversation_id,
    topic: request.topic,
    difficulty: request.difficulty,
    scenario: request.scenario ?? null,
    status: "active",
    initial_message: initialMessage,
  };
}
