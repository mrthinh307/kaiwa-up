let accessToken: string | null = null;

export function getAccessToken(): string | undefined {
  return accessToken ?? undefined;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
