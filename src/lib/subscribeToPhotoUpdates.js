export function subscribeToPhotoUpdates({
  onPhotoLikeUpdated,
  onError,
} = {}) {
  const eventSource = new EventSource('/api/photos/stream')

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
