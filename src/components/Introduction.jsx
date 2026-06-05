import HeartMark from './HeartMark'

function Introduction({
  onNext,
  onSkip,
  showAccessTip = false,
  accessCodeError = '',
  accessCodeErrorVisible = false,
  isVerifyingAccessCode = false,
  onAccessClick,
  onCloseAccessTip,
}) {
  return (
    <section className="relative flex min-h-screen items-center justify-center bg-zinc-50 px-5 py-10">
      <section className="w-full max-w-[520px] rounded-[32px] border border-white bg-white px-6 py-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <HeartMark className="h-8 w-8" />
        </div>

        <h1 className="title-cursive mb-5 text-5xl text-zinc-950 sm:text-4xl">
          📸 Share the Memories!
        </h1>

        <div className="space-y-4 rounded-[28px] px-5 py-5 text-base leading-7 text-zinc-700">
          <p>
            We’d love to see our special day through your eyes! Please upload any
            photos you take during the wedding to our shared website so
            everyone can enjoy the memories together.
          </p>

          <p>
            All uploaded photos will be gathered in one place for everyone to
            view, relive, and cherish. We can’t wait to see all the beautiful
            moments you capture! ✨
          </p>

          <p>
            Thank you for celebrating with us and helping us keep these memories
            forever.
          </p>

          <div className="pt-2">
            <p>Love,</p>
            <p className="font-semibold text-zinc-950">Lourien &amp; Kit</p>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="fixed left-6 bottom-6 inline-flex h-14 items-center justify-center rounded-full border border-white bg-white px-6 text-sm font-medium text-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition hover:scale-105 hover:bg-zinc-100 active:scale-95"
        onClick={onSkip}
      >
        Skip
      </button>

      <button
        type="button"
        className="fixed right-6 bottom-6 inline-flex h-14 items-center justify-center rounded-full border border-white bg-zinc-950 px-6 text-sm font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition hover:scale-105 hover:bg-zinc-800 active:scale-95"
        onClick={onNext}
      >
        Next
      </button>

      {showAccessTip ? (
        <div className="absolute right-6 bottom-24 z-20 w-64 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm shadow-xl">
          <p className="mb-3 text-zinc-700">
            Enter the pass code to continue.
          </p>

          {accessCodeError ? (
            <p
              className={`mb-3 text-xs font-medium text-red-600 transition-opacity duration-500 ${
                accessCodeErrorVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {accessCodeError}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100"
              onClick={onCloseAccessTip}
            >
              Cancel
            </button>

            <button
              type="button"
              className="rounded-full bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onAccessClick}
              disabled={isVerifyingAccessCode}
            >
              {isVerifyingAccessCode ? 'Checking...' : 'ACCESS'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default Introduction
