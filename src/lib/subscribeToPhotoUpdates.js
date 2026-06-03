import { getClientId } from './clientIdentity'

export function subscribeToPhotoUpdates({
  onPhotoCreated,
  onPhotoLikeUpdated,
  onError,
} = {}) {
  const clientId = encodeURIComponent(getClientId())
  const eventSource = new EventSource(`/api/photos/stream?clientId=${clientId}`)

  eventSource.addEventListener('photo-created', (event) => {
    try {
      const payload = JSON.parse(event.data)
      onPhotoCreated?.(payload)
    } catch (error) {
      onError?.(error)
    }
  })

  eventSource.addEventListener('photo-like-updated', (event) => {
    try {
      const payload = JSON.parse(event.data)
      onPhotoLikeUpdated?.(payload)
    } catch (error) {
      onError?.(error)
    }
  })

  eventSource.addEventListener('error', (event) => {
    onError?.(event)
  })

  return () => {
    eventSource.close()
  }
}
