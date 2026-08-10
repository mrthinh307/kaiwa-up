export function formatMemberSince(createdAt: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(createdAt));
}

export function getDisplayNameInitials(displayName: string) {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return "KU";
  }

  const firstInitial = nameParts[0]?.charAt(0) ?? "";
  const lastInitial = nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : "";

  return `${firstInitial}${lastInitial}`.toUpperCase();
}
