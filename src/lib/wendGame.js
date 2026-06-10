import { PHOTO_ACCESS_UUID_STORAGE_KEY } from './accessCode'

function getAccessCodeUuid() {
  return window.localStorage.getItem(PHOTO_ACCESS_UUID_STORAGE_KEY) || ''
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || fallbackMessage)
  }

  return payload
}

export async function fetchTodayWendGame() {
  const response = await fetch('/api/wend-game/today', {
    headers: {
      'x-access-code-uuid': getAccessCodeUuid(),
    },
  })

  return parseJsonResponse(response, 'Failed to load Wend game.')
}

export async function completeWendGame({ words, elapsedMs }) {
  const response = await fetch('/api/wend-game/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-code-uuid': getAccessCodeUuid(),
    },
    body: JSON.stringify({ words, elapsedMs }),
  })

  return parseJsonResponse(response, 'Failed to save Wend game score.')
}
