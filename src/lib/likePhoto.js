export async function likePhoto(photoId) {
  const response = await fetch(`/api/photos/${photoId}/like`, {
    method: 'POST',
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to like photo.')
  }

  return {
    id: String(payload?.id || photoId),
    likesCount: payload?.likesCount ?? null,
  }
}
