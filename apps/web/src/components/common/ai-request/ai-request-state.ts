export type AiRequestResult = {
  feedback?: string | null;
  score?: number | null;
  suggestion?: string | null;
  transcript?: string | null;
};

export type AiRequestState =
  | { status: "idle" }
  | { status: "processing" }
  | { result: AiRequestResult; status: "success" }
  | { errorMessage: string; status: "failed" };

export type AiRequestAction =
  | { type: "reset" }
  | { type: "start" }
  | { result: AiRequestResult; type: "succeed" }
  | { errorMessage: string; type: "fail" };

export const AI_REQUEST_IDLE_STATE: AiRequestState = { status: "idle" };

export function aiRequestReducer(_state: AiRequestState, action: AiRequestAction): AiRequestState {
  switch (action.type) {
    case "reset":
      return AI_REQUEST_IDLE_STATE;
    case "start":
      return { status: "processing" };
    case "succeed":
      return { result: action.result, status: "success" };
    case "fail":
      return { errorMessage: action.errorMessage, status: "failed" };
  }
}
