"use client";

import type { LoginRequest, UserResponse } from "@kaiwa-app/api-client";

import { createContext } from "react";

export type AuthStatus = "authenticated" | "guest" | "initializing" | "unavailable";

export type AuthActionResult =
  { kind: "success" } | { error: unknown; kind: "error"; response?: Response };

export type ProtectedRequest = <TResult extends { response?: Response }>(
  request: () => Promise<TResult>,
) => Promise<TResult>;

export type AuthContextValue = {
  isLoggingOut: boolean;
  login: (credentials: LoginRequest) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  protectedRequest: ProtectedRequest;
  retrySession: () => Promise<void>;
  status: AuthStatus;
  updateUser: (user: UserResponse) => void;
  user: UserResponse | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function getUserDisplayName(user: UserResponse): string {
  return user.display_name?.trim() || user.email;
}
