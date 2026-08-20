import { AiTutorScreen } from "./_components/ai-tutor-screen";
import { getMockAiTutorWorkspace } from "./_mocks/ai-tutor-mock-api";

export default async function AiTutorPage() {
  const workspace = await getMockAiTutorWorkspace(null);

  return <AiTutorScreen workspace={workspace} />;
}
