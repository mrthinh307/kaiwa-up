export const profilePreview = {
  avatarUrl: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  displayName: "Nguyen Van A",
  email: "user@example.com",
  level: 2,
  nextLevelExp: 250,
  totalExp: 150,
} satisfies ProfileViewModel;

export type ProfileViewModel = {
  avatarUrl: string | null;
  createdAt: string;
  displayName: string;
  email: string;
  level: number;
  nextLevelExp: number;
  totalExp: number;
};

type ProfilePreviewResult =
  | { kind: "success"; displayName: string }
  | { kind: "error"; code: "service_unavailable"; message: string };

export function saveProfilePreview(displayName: string): Promise<ProfilePreviewResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (displayName.toLowerCase() === "service unavailable") {
        resolve({
          code: "service_unavailable",
          kind: "error",
          message: "The profile service is unavailable. Your changes have not been lost.",
        });
        return;
      }

      resolve({ displayName, kind: "success" });
    }, 650);
  });
}
