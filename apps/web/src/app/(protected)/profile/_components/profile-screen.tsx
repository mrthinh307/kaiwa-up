"use client";

import { useState } from "react";

import type { ProfileViewModel } from "../_utils/profile-preview-adapter";

import { ProfileIdentityCard } from "./profile-identity-card";
import { ProfileInformationCard } from "./profile-information-card";
import { ProfileProgressCard } from "./profile-progress-card";
import { ProfileSessionCard } from "./profile-session-card";

export function ProfileScreen({ profile }: { profile: ProfileViewModel }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
      <div className="flex flex-col gap-6 lg:col-span-4 lg:h-full">
        <ProfileIdentityCard
          avatarUrl={profile.avatarUrl}
          className="lg:flex-1"
          createdAt={profile.createdAt}
          displayName={displayName}
          email={profile.email}
        />
        <ProfileSessionCard />
      </div>

      <div className="space-y-6 lg:col-span-8">
        <ProfileProgressCard
          level={profile.level}
          nextLevelExp={profile.nextLevelExp}
          totalExp={profile.totalExp}
        />
        <ProfileInformationCard
          displayName={displayName}
          email={profile.email}
          isEditing={isEditing}
          onEditingChange={setIsEditing}
          onNameChange={setDisplayName}
        />
      </div>
    </div>
  );
}
