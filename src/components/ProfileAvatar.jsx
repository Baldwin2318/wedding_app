function UserSilhouetteIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2.1c-4.22 0-7.5 2.12-7.5 4.85 0 .72.58 1.3 1.3 1.3h12.4c.72 0 1.3-.58 1.3-1.3 0-2.73-3.28-4.85-7.5-4.85Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ProfileAvatar({ src, name = 'Guest', className = '' }) {
  const trimmedSrc = typeof src === 'string' ? src.trim() : ''
  const label = `${name || 'Guest'} profile picture`

  return (
    <div
      className={`relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-zinc-100 via-white to-zinc-200 p-[2px] shadow-[0_5px_18px_rgba(0,0,0,0.12)] ring-1 ring-black/5 ${className}`}
    >
      <div className="flex h-full w-full overflow-hidden rounded-full bg-zinc-100 ring-2 ring-white">
        {trimmedSrc ? (
          <img
            className="h-full w-full object-cover"
            src={trimmedSrc}
            alt={label}
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-200 text-zinc-400"
            aria-label={label}
            role="img"
          >
            <UserSilhouetteIcon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileAvatar
