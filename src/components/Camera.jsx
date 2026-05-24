import { useEffect, useRef, useState } from 'react'

function Camera() {
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

  useEffect(() => {
    handleOpenCamera()

    return () => {
      stopStream()
    }
  }, [])

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
    setCameraStatus('Photo captured. Choose Retake or Done.')
    stopStream()
    setIsCameraActive(false)
  }

  function handleRetake() {
    setCapturedPhoto('')
    setIsDone(false)
    handleOpenCamera()
  }

  function handleDone() {
    stopStream()
    setIsCameraActive(false)
    setIsDone(true)
    setCameraStatus('Photo confirmed. You can keep this preview or retake it.')
  }

  return (
    <section className="page">
      <section className="content">
        <h1>Camera</h1>

        <div className="camera-preview">
          {capturedPhoto ? (
            <img className="camera-feed" src={capturedPhoto} alt="Captured preview" />
          ) : isCameraActive ? (
            <>
              <video
                ref={videoRef}
                className="camera-feed"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="capture-canvas" />
            </>
          ) : (
            <p className="camera-placeholder">
              {isOpeningCamera
                ? 'Opening camera...'
                : 'Tap the camera button below to start your camera.'}
            </p>
          )}
        </div>

        {cameraStatus ? <p className="camera-status">{cameraStatus}</p> : null}
        {cameraError ? <p className="camera-error">{cameraError}</p> : null}

        {capturedPhoto ? (
          <div className="caption-block">
            <label className="caption-label" htmlFor="photo-caption">
              Add a caption
            </label>
            <textarea
              id="photo-caption"
              className="caption-input"
              rows="3"
              placeholder="Write a short note about this photo..."
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
        ) : null}

        <div className="guide-actions">
          {isCameraActive ? (
            <button type="button" className="action-button" onClick={handleCapture}>
              Capture
            </button>
          ) : null}

          {capturedPhoto ? (
            <>
              <button
                type="button"
                className="action-button secondary-button"
                onClick={handleRetake}
              >
                Retake
              </button>
              <button type="button" className="action-button" onClick={handleDone}>
                Done
              </button>
            </>
          ) : null}
        </div>

        {isDone ? (
          <p className="camera-done">
            Saved for this session{caption ? ` with caption: "${caption}"` : '.'}
          </p>
        ) : null}
      </section>
    </section>
  )
}

export default Camera
