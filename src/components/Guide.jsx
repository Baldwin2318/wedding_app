import MinimalCameraIcon from './MinimalCameraIcon'
import MinimalHomeIcon from './MinimalHomeIcon'

function Guide({
  onNext,
  onViewFeed,
  showAccessTip = false,
  accessCodeError = '',
  accessCodeErrorVisible = false,
  isVerifyingAccessCode = false,
  onAccessClick,
  onCloseAccessTip,
  canUseCamera = true,
 accessCodeInput = '',
  onAccessCodeInputChange,
}) {
  return (
    <section className="relative flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <section className="w-full max-w-[520px] rounded-[32px] border border-white bg-white px-6 py-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <h1 className="title-cursive mb-8 text-4xl font-semibold text-zinc-950">
          How it works
        </h1>

        <div className="space-y-5 text-base leading-7 text-zinc-700">
          <div className="rounded-3xl px-5 py-5">
            <p className="title-cursive mb-2 text-3xl font-semibold text-zinc-950">
              Step 1
            </p>
            <p className="inline-flex items-center justify-center gap-2">
              <MinimalCameraIcon className="h-5 w-5" />
              <span>Tap to take a photo</span>
            </p>
          </div>

          <div className="rounded-3xl px-5 py-5">
            <p className="title-cursive mb-2 text-3xl font-semibold text-zinc-950">
              Step 2
            </p>
            <p>Select “Allow” to use the camera</p>
          </div>

          <div className="rounded-3xl px-5 py-5">
            <p className="title-cursive mb-2 text-3xl font-semibold text-zinc-950">
              Step 3
            </p>
            <p>Capture yourself</p>
          </div>
        </div>
      </section>

      {showAccessTip ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/35 px-5 backdrop-blur-[4px]">
          <div className="w-full max-w-[340px] overflow-hidden rounded-[30px] border border-white/70 bg-white/95 text-center shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
            <div className="px-6 pt-7 pb-5">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 shadow-inner">
                <MinimalCameraIcon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Passcode required
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Enter your wedding passcode to take or upload photos.
              </p>

              <input
                type="password"
                value={accessCodeInput}
                onChange={(event) => onAccessCodeInputChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onAccessClick?.()
                  }
                }}
                className="mb-4 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-center text-base font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                placeholder="Pass code"
                autoComplete="current-password"
                autoFocus
              />
              
              {accessCodeError ? (
                <p
                  className={`mt-4 text-sm font-medium text-red-600 transition-opacity duration-500 ${
                    accessCodeErrorVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {accessCodeError}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 border-t border-zinc-200/80">
              <button
                type="button"
                className="border-r border-zinc-200/80 px-4 py-4 text-sm font-semibold text-zinc-600 transition active:bg-zinc-100"
                onClick={onCloseAccessTip}
              >
                Cancel
              </button>

              <button
                type="button"
                className="px-4 py-4 text-sm font-semibold text-sky-600 transition active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onAccessClick}
                disabled={isVerifyingAccessCode}
              >
                {isVerifyingAccessCode ? 'Checking...' : 'Enter code'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      
      <button
        type="button"
        className="absolute left-6 bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white bg-white text-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition hover:scale-105 hover:bg-zinc-100 active:scale-95"
        onClick={onViewFeed}
        aria-label="Go to news feed"
      >
        <MinimalHomeIcon className="h-6 w-6" />
      </button>

      <div className="absolute right-6 bottom-6 flex items-center gap-3">
        <button
          type="button"
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full border border-white text-white shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition ${
            canUseCamera
              ? 'bg-zinc-950 hover:scale-105 hover:bg-zinc-800 active:scale-95'
              : 'cursor-not-allowed bg-zinc-300 opacity-60'
          }`}
          onClick={onNext}
          disabled={!canUseCamera}
          aria-label="Go to camera"
        >
          <MinimalCameraIcon className="h-6 w-6" />
        </button>
      </div>
    </section>
  )
}

export default Guide
