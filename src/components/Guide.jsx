function Guide({ onNext, onViewFeed }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-8 py-12 sm:px-6">
      <section className="max-w-2xl text-center">
            {/* <h1 className="title-cursive mb-6 text-6xl text-zinc-950 sm:text-5xl">
            Guide
            </h1> */}
        <div className="space-y-4 text-lg leading-8 text-zinc-700 sm:text-base">
          <p className="title-cursive font-semibold text-zinc-950 text-3xl">Step 1</p>
          <p>Click &quot;📸&quot; to take a photo</p>
          <p className="title-cursive font-semibold text-zinc-950 text-3xl">Step 2</p>
          <p>Select "Allow" to use the camera</p>
          <p className="title-cursive font-semibold text-zinc-950 text-3xl">Step 3</p>
          <p>Capture yourself</p>
        </div>
      </section>

      <button
        type="button"
        className="absolute bottom-8 left-8 inline-flex h-14 w-14 items-center justify-center rounded-full border border-zinc-950 bg-white text-2xl text-zinc-950 transition hover:bg-zinc-950 hover:text-white sm:bottom-6 sm:left-6"
        onClick={onViewFeed}
        aria-label="Go to news feed"
      >
        <span aria-hidden="true">🖼️</span>
      </button>

      <button
        type="button"
        className="absolute right-8 bottom-8 inline-flex h-14 w-14 items-center justify-center rounded-full border border-zinc-950 bg-white text-2xl text-zinc-950 transition hover:bg-zinc-950 hover:text-white sm:right-6 sm:bottom-6"
        onClick={onNext}
        aria-label="Go to camera"
      >
        <span aria-hidden="true">📸</span>
      </button>
    </section>
  )
}

export default Guide
