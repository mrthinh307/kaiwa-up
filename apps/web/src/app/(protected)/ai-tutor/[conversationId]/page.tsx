import { redirect } from "next/navigation";

import { AiTutorScreen } from "../_components/ai-tutor-screen";
import { getMockAiTutorWorkspace } from "../_mocks/ai-tutor-mock-api";

export default async function AiTutorConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const workspace = await getMockAiTutorWorkspace(conversationId);

  if (!workspace.selectedConversation) {
    redirect("/ai-tutor");
  }

  return <AiTutorScreen workspace={workspace} />;
}
