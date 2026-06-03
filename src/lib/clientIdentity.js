const CLIENT_ID_STORAGE_KEY = 'wedding_app_client_id'

export function getClientId() {
  if (typeof window === 'undefined') {
    return 'server'
  }

  const existingClientId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)

  if (existingClientId) {
    return existingClientId
  }

  const nextClientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `client-${Date.now()}`

  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, nextClientId)
  return nextClientId
}
