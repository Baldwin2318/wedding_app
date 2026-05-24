export async function fetchSavedPhotos() {
  const response = await fetch('/api/photos')
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load saved photos.')
  }

  return Array.isArray(payload?.photos) ? payload.photos : []
}
