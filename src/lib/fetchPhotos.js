import { getAccessCodeHeaders } from './accessCode'

export async function fetchSavedPhotos({ limit = 12, offset = 0 } = {}) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  const response = await fetch(`/api/photos?${searchParams.toString()}`, {
    headers: {
      ...getAccessCodeHeaders(),
    },
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load saved photos.')
  }

  return {
    hasMore: Boolean(payload?.hasMore),
    nextOffset:
      typeof payload?.nextOffset === 'number' ? payload.nextOffset : null,
    photos: Array.isArray(payload?.photos) ? payload.photos : [],
  }
}
