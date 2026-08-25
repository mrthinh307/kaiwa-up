import { Badge } from "@/components/ui/badge";

import { ProfileSkeleton } from "./_components/profile-skeleton";

export default function ProfileLoading() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <header className="mb-8 sm:mb-10">
          <Badge className="mb-4 shadow-shadow">Your profile</Badge>
          <h1 className="text-3xl leading-tight sm:text-4xl">Account and learning progress</h1>
          <p className="mt-3 leading-relaxed text-foreground/75 sm:text-lg">
            Keep your learner identity up to date and see how close you are to your next level.
          </p>
        </header>
        <ProfileSkeleton />
      </div>
    </main>
  );
}
