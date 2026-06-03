import { useEffect, useRef, useState } from 'react'
import MinimalCameraIcon from './MinimalCameraIcon'
import MinimalGalleryIcon from './MinimalGalleryIcon'
import MinimalHomeIcon from './MinimalHomeIcon'

function Camera({ isActive, onDone, onUploadPhoto, onViewFeed }) {
  const captionFieldRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraStatus, setCameraStatus] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isOpeningCamera, setIsOpeningCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  useEffect(() => {
    if (!isActive) {
      stopStream()
    }
  }, [isActive])

  useEffect(() => {
    return () => {
      if (capturedPhoto.startsWith('blob:')) {
        URL.revokeObjectURL(capturedPhoto)
      }
    }
  }, [capturedPhoto])

  useEffect(() => {
    async function attachStream() {
      if (!videoRef.current || !streamRef.current || !isCameraActive) {
        return
      }

      videoRef.current.srcObject = streamRef.current
      await videoRef.current.play().catch(() => {})
    }

    attachStream()
  }, [isCameraActive, capturedPhoto])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  async function requestStream(videoConstraints) {
    return navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    })
  }

  async function handleOpenCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access.')
      setCameraStatus('')
      return
    }

    try {
      setCameraError('')
      setCameraStatus('Requesting camera access...')
      setIsOpeningCamera(true)
      setIsDone(false)
      setIsUploading(false)
      if (capturedPhoto.startsWith('blob:')) {
        URL.revokeObjectURL(capturedPhoto)
      }
      setCapturedPhoto('')
      setSelectedPhotoFile(null)
      setCaption('')
      setIsCameraActive(false)

      stopStream()

      let stream

      try {
        stream = await requestStream({ facingMode: 'user' })
      } catch {
        stream = await requestStream(true)
      }

      streamRef.current = stream
      setIsCameraActive(true)
      setCameraStatus('Camera ready. Tap Capture when you are happy with the frame.')
    } catch {
      setIsCameraActive(false)
      setCameraStatus('')
      setCameraError(
        'Camera access was blocked or is unavailable. On iPhone use Safari, on Android use Chrome, then allow permission when prompted.',
      )
    } finally {
      setIsOpeningCamera(false)
    }
  }

  function handleCapture() {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 960

    const context = canvas.getContext('2d')

    if (!context) {
      setCameraError('Could not capture the photo on this device.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (capturedPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto)
    }
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.92))
    setSelectedPhotoFile(null)
    setCaption('')
    setCameraError('')
    setCameraStatus('Photo captured. Choose Retake or Done.')
    stopStream()
    setIsCameraActive(false)
  }

  function handleRetake() {
    const hadSelectedPhotoFile = Boolean(selectedPhotoFile)

    if (capturedPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto)
    }
    setCapturedPhoto('')
    setSelectedPhotoFile(null)
    setIsDone(false)
    setIsUploading(false)
    setCameraError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (hadSelectedPhotoFile) {
      setCameraStatus('')
      handleOpenGalleryPicker()
      return
    }

    handleOpenCamera()
  }

  async function handleDone() {
    if (!capturedPhoto || isUploading) {
      return
    }

    stopStream()
    setIsCameraActive(false)
    setIsUploading(true)
    setCameraError('')
    setCameraStatus('Uploading photo...')

    try {
      if (selectedPhotoFile && onUploadPhoto) {
        await onUploadPhoto(selectedPhotoFile, caption)
      } else if (onDone) {
        await onDone({
          image: capturedPhoto,
          caption,
        })
      }

      setIsDone(true)
      setCameraStatus('Photo uploaded successfully.')
    } catch (error) {
      setIsDone(false)
      setCameraStatus('')
      setCameraError(
        error instanceof Error
          ? error.message
          : 'Upload failed. Please try again.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  function handleOpenGalleryPicker() {
    if (isUploading) {
      return
    }

    fileInputRef.current?.click()
  }

  async function handleSelectedPhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file || !onUploadPhoto || isUploading) {
      event.target.value = ''
      return
    }

    stopStream()
    setIsCameraActive(false)
    if (capturedPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto)
    }
    setCapturedPhoto(URL.createObjectURL(file))
    setSelectedPhotoFile(file)
    setCaption('')
    setIsDone(false)
    setCameraError('')
    setCameraStatus('Photo selected. Add a caption or tap Done.')
    event.target.value = ''
  }

  function handleCaptionFocus() {
    setTimeout(() => {
      captionFieldRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 120)
  }
  
  return (
    <section className="app-viewport keyboard-safe-bottom relative overflow-y-auto bg-zinc-50 px-5 py-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelectedPhotoChange}
      />
  
      <section className="mx-auto flex min-h-full w-full max-w-[520px] items-center justify-center text-center">
        <div className="w-full rounded-[32px] border border-white bg-white px-5 py-7 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
          <h1 className="title-cursive mb-6 text-5xl text-zinc-950 sm:text-4xl">
            Camera
          </h1>
  
          <div>
            {capturedPhoto ? (
              <img
                className="mx-auto block w-full max-w-[360px] rounded-[28px] border border-white bg-zinc-100 object-contain shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                src={capturedPhoto}
                alt="Captured preview"
              />
            ) : isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  className="mx-auto block w-full max-w-[360px] rounded-[28px] border border-white bg-zinc-100 object-cover shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <p className="mx-auto flex min-h-[260px] w-full max-w-[360px] items-center justify-center rounded-[28px] border border-white bg-zinc-100 px-6 text-base leading-7 text-zinc-600 shadow-inner">
                {isOpeningCamera
                  ? 'Opening camera...'
                  : 'Tap Open camera below and allow camera permission'}
              </p>
            )}
          </div>
  
          {cameraStatus ? (
            <p className="mt-4 text-sm text-zinc-500">{cameraStatus}</p>
          ) : null}
  
          {cameraError ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {cameraError}
            </p>
          ) : null}
  
          {capturedPhoto ? (
            <div className="mx-auto mt-5 w-full max-w-[360px] text-left">
              <label
                className="mb-2 block text-sm font-semibold text-zinc-950"
                htmlFor="photo-caption"
              >
                Add a caption
              </label>
  
              <textarea
                ref={captionFieldRef}
                id="photo-caption"
                className="w-full rounded-3xl border border-white bg-zinc-100 px-4 py-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-950/10"
                rows="3"
                placeholder="Write a short note..."
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                onFocus={handleCaptionFocus}
              />
            </div>
          ) : null}
  
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {isCameraActive ? (
              <button
                type="button"
                className="rounded-full border border-zinc-950 bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition hover:scale-105 active:scale-95"
                onClick={handleCapture}
                disabled={isUploading}
              >
                Capture
              </button>
            ) : null}
  
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  className="rounded-full border border-white bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 active:scale-95"
                  onClick={handleRetake}
                  disabled={isUploading}
                >
                  Retake
                </button>
  
                <button
                  type="button"
                  className="rounded-full border border-zinc-950 bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition hover:scale-105 active:scale-95"
                  onClick={handleDone}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Done'}
                </button>
              </>
            ) : !isCameraActive ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-950 bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition hover:scale-105 active:scale-95"
                onClick={handleOpenCamera}
                disabled={isOpeningCamera || isUploading}
              >
                {!isOpeningCamera ? <MinimalCameraIcon className="h-4 w-4" /> : null}
                {isOpeningCamera ? 'Opening...' : 'Open camera'}
              </button>
            ) : null}
          </div>
  
          {isDone ? (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Photo uploaded successfully.
            </p>
          ) : null}
        </div>
      </section>
  
      <button
        type="button"
        className="fixed bottom-6 left-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white bg-white text-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition hover:scale-105 hover:bg-zinc-100 active:scale-95"
        onClick={onViewFeed}
        aria-label="Go to news feed"
      >
        <MinimalHomeIcon className="h-6 w-6" />
      </button>
  
      <button
        type="button"
        className="fixed right-6 bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white bg-white text-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition hover:scale-105 hover:bg-zinc-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleOpenGalleryPicker}
        aria-label="Upload from photos"
        disabled={isUploading}
      >
        <MinimalGalleryIcon className="h-6 w-6" />
      </button>
    </section>
  )
}

export default Camera
