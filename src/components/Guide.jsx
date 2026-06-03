import MinimalCameraIcon from './MinimalCameraIcon'
import MinimalHomeIcon from './MinimalHomeIcon'

function Guide({ onNext, onViewFeed }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <section className="w-full max-w-[520px] rounded-[32px] border border-white bg-white px-6 py-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <h1 className="title-cursive mb-8 text-4xl font-semibold text-zinc-950">
          How it works
        </h1>

        <div className="space-y-5 text-base leading-7 text-zinc-700">
          <div className="rounded-3xl bg-zinc-50 px-5 py-5">
            <p className="title-cursive mb-2 text-3xl font-semibold text-zinc-950">
              Step 1
            </p>
            <p className="inline-flex items-center justify-center gap-2">
              <MinimalCameraIcon className="h-5 w-5" />
              <span>Tap to take a photo</span>
            </p>
          </div>

          <div className="rounded-3xl bg-zinc-50 px-5 py-5">
            <p className="title-cursive mb-2 text-3xl font-semibold text-zinc-950">
              Step 2
            </p>
            <p>Select “Allow” to use the camera</p>
          </div>

          <div className="rounded-3xl bg-zinc-50 px-5 py-5">
            <p className="title-cursive mb-2 text-3xl font-semibold text-zinc-950">
              Step 3
            </p>
            <p>Capture yourself</p>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="absolute bottom-6 left-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white bg-white text-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition hover:scale-105 hover:bg-zinc-100 active:scale-95"
        onClick={onViewFeed}
        aria-label="Go to news feed"
      >
        <MinimalHomeIcon className="h-6 w-6" />
      </button>

      <button
        type="button"
        className="absolute right-6 bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white bg-zinc-950 text-white shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition hover:scale-105 hover:bg-zinc-800 active:scale-95"
        onClick={onNext}
        aria-label="Go to camera"
      >
        <MinimalCameraIcon className="h-6 w-6" />
      </button>
    </section>
  )
}

export default Guide
