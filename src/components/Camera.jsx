import { useEffect, useRef, useState } from 'react'

function Camera({ isActive, onDone }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraStatus, setCameraStatus] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isOpeningCamera, setIsOpeningCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState('')
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
      setCapturedPhoto('')
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
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.92))
    setCaption('')
    setCameraError('')
    setCameraStatus('Photo captured. Choose Retake or Done.')
    stopStream()
    setIsCameraActive(false)
  }

  function handleRetake() {
    setCapturedPhoto('')
    setIsDone(false)
    setIsUploading(false)
    setCameraError('')
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
      if (onDone) {
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

  return (
    <section className="flex min-h-screen items-center justify-center px-8 py-12 sm:px-6">
      <section className="w-full max-w-2xl text-center">
        <h1 className="mb-6 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Camera
        </h1>

        <div className="mt-8">
          {capturedPhoto ? (
            <img
              className="mx-auto block w-full max-w-[360px] rounded-[20px] border border-zinc-950 bg-stone-100 object-contain"
              src={capturedPhoto}
              alt="Captured preview"
            />
          ) : isCameraActive ? (
            <>
              <video
                ref={videoRef}
                className="mx-auto block w-full max-w-[360px] rounded-[20px] border border-zinc-950 bg-stone-100 object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : (
            <p className="mx-auto flex min-h-[240px] w-full max-w-[360px] items-center justify-center rounded-[20px] border border-zinc-950 bg-stone-100 px-6 text-base text-zinc-700">
              {isOpeningCamera
                ? 'Opening camera...'
                : 'Tap the camera button below to start your camera.'}
            </p>
          )}
        </div>

        {cameraStatus ? (
          <p className="mt-4 text-base text-zinc-600">{cameraStatus}</p>
        ) : null}
        {cameraError ? (
          <p className="mt-4 text-base text-red-700">{cameraError}</p>
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
              id="photo-caption"
              className="w-full rounded-2xl border border-zinc-950 bg-white px-3.5 py-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              rows="3"
              placeholder="Write a short note about this photo..."
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {isCameraActive ? (
            <button
              type="button"
              className="rounded-full border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
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
                className="rounded-full border border-zinc-950 bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
                onClick={handleRetake}
                disabled={isUploading}
              >
                Retake
              </button>
              <button
                type="button"
                className="rounded-full border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
                onClick={handleDone}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Done'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-full border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
              onClick={handleOpenCamera}
              disabled={isOpeningCamera || isUploading}
            >
              {isOpeningCamera ? 'Opening...' : 'Open camera'}
            </button>
          )}
        </div>

        {isDone ? (
          <p className="mt-4 font-semibold text-zinc-950">
            Saved to Cloudflare R2{caption ? ` with caption: "${caption}"` : '.'}
          </p>
        ) : null}
      </section>
    </section>
  )
}

export default Camera
