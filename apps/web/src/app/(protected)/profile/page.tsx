import type { Metadata } from "next";

import { ProfileContent } from "./_components/profile-content";

export const metadata: Metadata = {
  description: "View your KaiwaUp account details and Japanese learning progress.",
  title: "Your profile | KaiwaUp",
};

export default function ProfilePage() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <ProfileContent />
      </div>
    </main>
  );
}
