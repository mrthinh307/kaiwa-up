"use client";

import type { GamificationProfileResponse, UserResponse } from "@kaiwa-app/api-client";

import { useState } from "react";

import { getUserDisplayName } from "@/contexts/auth-context";

import { ProfileIdentityCard } from "./profile-identity-card";
import { ProfileInformationCard } from "./profile-information-card";
import { ProfileProgressCard } from "./profile-progress-card";
import { ProfileSessionCard } from "./profile-session-card";

type ProfileScreenProps = {
  progress: GamificationProfileResponse;
  user: UserResponse;
};

export function ProfileScreen({ progress, user }: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const displayName = getUserDisplayName(user);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
      <div className="flex flex-col gap-6 lg:col-span-4 lg:h-full">
        <ProfileIdentityCard
          avatarUrl={user.avatar_url}
          className="lg:flex-1"
          createdAt={user.created_at}
          displayName={displayName}
          email={user.email}
        />
        <ProfileSessionCard />
      </div>

      <div className="space-y-6 lg:col-span-8">
        <ProfileProgressCard
          expToNextLevel={progress.exp_to_next_level}
          level={progress.level}
          nextLevelExp={progress.next_level_min_exp ?? null}
          totalExp={progress.total_exp}
        />
        <ProfileInformationCard
          displayName={displayName}
          email={user.email}
          isEditing={isEditing}
          onEditingChange={setIsEditing}
        />
      </div>
    </div>
  );
}
