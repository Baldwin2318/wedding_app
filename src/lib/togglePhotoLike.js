export async function togglePhotoLike(photoId, shouldLike) {
  const response = await fetch(`/api/photos/${photoId}/like`, {
    method: shouldLike ? 'POST' : 'DELETE',
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        (shouldLike ? 'Failed to like photo.' : 'Failed to unlike photo.'),
    )
  }

  return {
    id: String(payload?.id || photoId),
    likesCount: payload?.likesCount ?? null,
    likedByCurrentVisitor: Boolean(payload?.likedByCurrentVisitor),
  }
}
