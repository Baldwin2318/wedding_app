function Guide({ onNext }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-8 py-12 sm:px-6">
      <section className="max-w-2xl text-center">
        <h1 className="mb-6 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Guide
        </h1>
        <div className="space-y-4 text-lg leading-8 text-zinc-700 sm:text-base">
          <p className="font-semibold text-zinc-950">Step 1</p>
          <p>Click &quot;Take Photo&quot;</p>
          <p className="font-semibold text-zinc-950">Step 2</p>
          <p>Capture yourself</p>
          <p className="font-semibold text-zinc-950">Step 3</p>
          <p>Hit &quot;retake&quot; or &quot;done&quot;</p>
        </div>
      </section>

      <button
        type="button"
        className="absolute right-8 bottom-8 inline-flex h-14 w-14 items-center justify-center rounded-full border border-zinc-950 bg-white text-2xl text-zinc-950 transition hover:bg-zinc-950 hover:text-white sm:right-6 sm:bottom-6"
        onClick={onNext}
        aria-label="Go to camera"
      >
        <span aria-hidden="true">📷</span>
      </button>
    </section>
  )
}

export default Guide
