import { getAccessCodeHeaders } from './accessCode'

export async function fetchMembers() {
  const response = await fetch('/api/profiles', {
    headers: {
      ...getAccessCodeHeaders(),
    },
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load members.')
  }

  return Array.isArray(payload?.profiles) ? payload.profiles : []
}
