function dataUrlToFile(dataUrl, filename = `capture-${Date.now()}.jpg`) {
  const [header, base64] = dataUrl.split(',')

  if (!header || !base64) {
    throw new Error('Invalid image data received from the camera.')
  }

  const mimeMatch = header.match(/data:(.*?);base64/)
  const mimeType = mimeMatch?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], filename, { type: mimeType })
}

async function uploadPhotoFile({ file, caption = '' }) {
  if (!file) {
    throw new Error('No photo file was selected.')
  }

  const endpoint = import.meta.env.VITE_UPLOAD_API_URL || '/api/photos'
  const formData = new FormData()

  formData.append('file', file)
  formData.append('caption', caption)

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Upload failed. Please try again.')
  }

  if (!payload?.imageUrl) {
    throw new Error('Upload succeeded, but no image URL was returned.')
  }

  return payload
}

export async function uploadCapturedPhoto({ imageDataUrl, caption = '' }) {
  if (!imageDataUrl) {
    throw new Error('No photo was captured.')
  }

  return uploadPhotoFile({
    file: dataUrlToFile(imageDataUrl),
    caption,
  })
}

export async function uploadSelectedPhoto({ file, caption = '' }) {
  return uploadPhotoFile({ file, caption })
}
