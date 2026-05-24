export async function trackAppOpen() {
  const response = await fetch('/api/visitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to track app open.')
  }

  return payload
}
