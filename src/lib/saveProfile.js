import { getAccessCodeHeaders } from './accessCode'

export async function saveProfile({ name = '', file = null } = {}) {
  const formData = new FormData()

  if (typeof name === 'string' && name.trim()) {
    formData.append('name', name.trim())
  }

  if (file) {
    formData.append('file', file)
  }

  const response = await fetch('/api/profiles', {
    method: 'POST',
    headers: {
      ...getAccessCodeHeaders(),
    },
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to save profile.')
  }

  if (!payload?.profile) {
    throw new Error('Profile save succeeded, but no profile was returned.')
  }

  return payload.profile
}
