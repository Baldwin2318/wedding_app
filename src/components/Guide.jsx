function Guide({ onNext }) {
  return (
    <section className="page">
      <section className="content">
        <h1>Guide</h1>
        <p>Step 1</p>
        <p>Click "Take Photo"</p>
        <p>Step 2</p>
        <p>Capture yourself</p>
        <p>Step 3</p>
        <p>Hit "retake" or "done"</p>
      </section>

      <button
        type="button"
        className="camera-button"
        onClick={onNext}
        aria-label="Go to camera"
      >
        <span aria-hidden="true">📷</span>
      </button>
    </section>
  )
}

export default Guide
