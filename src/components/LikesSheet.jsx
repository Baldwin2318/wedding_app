import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'

function HeartIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 20.5 4.9 13.9a4.78 4.78 0 0 1 0-6.8 4.71 4.71 0 0 1 6.72 0L12 7.49l.38-.39a4.71 4.71 0 0 1 6.72 0 4.78 4.78 0 0 1 0 6.8L12 20.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LikesSheet({
  post,
  likes = [],
  isLoading = false,
  error = '',
  onClose,
  onSelectProfile,
}) {
  if (!post) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-[3px]">
      <button
        type="button"
        aria-label="Close likes"
        className="absolute inset-0"
        onClick={onClose}
      />

      <section className="relative flex max-h-[calc(100dvh-3rem)] min-h-[38vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <header className="relative shrink-0 border-b border-zinc-200/90 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 pr-12">
            <HeartIcon className="h-[15px] w-[15px] shrink-0 text-zinc-950" />
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-zinc-950">
              Likes
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close likes"
            onClick={onClose}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-2xl leading-none text-zinc-950 transition hover:bg-zinc-100 active:scale-95"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950" />
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="flex h-40 items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : null}

          {!isLoading && !error && likes.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-semibold text-zinc-950">No likes yet</p>
              <p className="mt-1 text-sm text-zinc-500">People who like this photo will appear here.</p>
            </div>
          ) : null}

          {!isLoading && !error
            ? likes.map((like) => (
                <button
                  key={`${like.uuid || like.name}-${like.createdAt || ''}`}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 active:scale-[0.99]"
                  onClick={() =>
                    onSelectProfile?.({
                      authorId: like.uuid || '',
                      author: like.name || 'Guest',
                      profileImage: like.profileImageUrl || '',
                      verified: Boolean(like.verified),
                    })
                  }
                >
                  <ProfileAvatar
                    src={like.profileImageUrl}
                    name={like.name}
                    className="h-11 w-11 shadow-none ring-0"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-zinc-950">
                        {like.name || 'Guest'}
                      </span>
                      {like.verified ? <VerifiedBadge className="h-[15px] w-[15px]" checkClassName="h-[10px] w-[10px]" /> : null}
                    </div>
                  </div>
                </button>
              ))
            : null}
        </div>
      </section>
    </div>
  )
}

export default LikesSheet
