import HeartMark from './HeartMark'
import MinimalHomeIcon from './MinimalHomeIcon'

function Introduction({
  onNext,
  onSkip,
  showAccessTip = false,
  accessCodeError = '',
  accessCodeErrorVisible = false,
  isVerifyingAccessCode = false,
  onAccessClick,
  onCloseAccessTip,
  accessCodeInput = '',
  onAccessCodeInputChange,
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
        className="fixed left-6 bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white bg-white text-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition hover:scale-105 hover:bg-zinc-100 active:scale-95"
        onClick={onSkip}
        aria-label="Go home"
      >
        <MinimalHomeIcon className="h-6 w-6" />
      </button>

      <button
        type="button"
        className="fixed right-6 bottom-6 inline-flex h-14 items-center justify-center rounded-full border border-white bg-zinc-950 px-6 text-sm font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition hover:scale-105 hover:bg-zinc-800 active:scale-95"
        onClick={onNext}
      >
        Next
      </button>

      {showAccessTip ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/25 px-5 backdrop-blur-md">
        <div className="w-full max-w-[320px] rounded-[28px] border border-white/70 bg-white/85 p-5 text-center text-sm shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <p className="mb-4 font-medium text-zinc-800">
            Enter the pass code to continue.
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
              className={`mb-4 text-xs font-medium text-red-600 transition-opacity duration-500 ${
                accessCodeErrorVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {accessCodeError}
            </p>
          ) : null}
    
          <div className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white/70">
            <button
              type="button"
              className="flex-1 px-4 py-3 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 active:bg-zinc-200"
              onClick={onCloseAccessTip}
            >
              Cancel
            </button>
    
            <div className="w-px bg-zinc-200" />
    
            <button
              type="button"
              className="flex-1 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 active:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onAccessClick}
              disabled={isVerifyingAccessCode}
            >
              {isVerifyingAccessCode ? 'Checking...' : 'ACCESS'}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </section>
  )
}

export default Introduction
