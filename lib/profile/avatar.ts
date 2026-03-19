export function resolveCanonicalAvatarUrl(
  profileAvatarUrl: string | null | undefined,
  fallbackAvatarUrl: string | null | undefined
): string | null {
  return profileAvatarUrl ?? fallbackAvatarUrl ?? null
}

export function withCanonicalAvatarUrl<T extends { avatar_url?: string | null }>(
  userRow: T | null,
  profileAvatarUrl: string | null | undefined
): T | null {
  if (!userRow) {
    return null
  }

  return {
    ...userRow,
    avatar_url: resolveCanonicalAvatarUrl(profileAvatarUrl, userRow.avatar_url),
  }
}