"use client";

import type { LoginRequest, UserResponse } from "@kaiwa-app/api-client";
import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AuthContext,
  type AuthActionResult,
  type AuthContextValue,
  type AuthStatus,
  type ProtectedRequest,
} from "@/contexts/auth-context";
import { clearAccessToken, setAccessToken } from "@/lib/access-token";
import { getMe, login as loginRequest, logout as logoutRequest } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";
import {
  refreshAccessToken,
  requestWithAccessTokenRetry,
  type RefreshOutcome,
} from "@/lib/auth-session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [user, setUser] = useState<UserResponse | null>(null);
  const hasBootstrapped = useRef(false);
  const isLoggingOutRef = useRef(false);

  const becomeGuest = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setStatus("guest");
  }, []);

  const applyRefreshOutcome = useCallback(
    (refreshOutcome: RefreshOutcome): void => {
      if (refreshOutcome.kind === "unauthorized") {
        becomeGuest();
        return;
      }

      if (refreshOutcome.kind === "unavailable") {
        setStatus("unavailable");
        return;
      }

      setUser(refreshOutcome.user);
      setStatus("authenticated");
    },
    [becomeGuest],
  );

  const retrySession = useCallback(async () => {
    setStatus("initializing");
    applyRefreshOutcome(await refreshAccessToken());
  }, [applyRefreshOutcome]);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    void retrySession();
  }, [retrySession]);

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthActionResult> => {
    const loginResult = await loginRequest({ body: credentials });

    if (!loginResult.data) {
      return { error: loginResult.error, kind: "error", response: loginResult.response };
    }

    setAccessToken(loginResult.data.access_token);
    const meResult = await getMe();

    if (!meResult.data) {
      clearAccessToken();
      return { error: meResult.error, kind: "error", response: meResult.response };
    }

    setUser(meResult.data);
    setStatus("authenticated");
    return { kind: "success" };
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      const result = await logoutRequest();

      if (!result.response?.ok) {
        const failure = parseApiFailure(result);
        toast.error("We could not log you out", { description: failure.message });
        return;
      }

      becomeGuest();
      router.replace("/login");
      router.refresh();
    } finally {
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  }, [becomeGuest, router]);

  const protectedRequest = useCallback<ProtectedRequest>(
    (request) => requestWithAccessTokenRetry(request, becomeGuest),
    [becomeGuest],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggingOut,
      login,
      logout,
      protectedRequest,
      retrySession,
      status,
      updateUser: setUser,
      user,
    }),
    [isLoggingOut, login, logout, protectedRequest, retrySession, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
