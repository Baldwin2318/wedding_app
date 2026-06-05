import { getAccessCodeHeaders } from './accessCode'

export async function deletePhoto(photoId) {
  const response = await fetch(`/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: {
      ...getAccessCodeHeaders(),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to delete photo.')
  }

  return {
    id: String(payload?.id || photoId),
  }
}
