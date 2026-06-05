import { useEffect } from 'react'
import CommentIcon from './CommentIcon'

function HeartIcon({ className = 'h-6 w-6', isLiked = false }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 20.5 4.9 13.9a4.78 4.78 0 0 1 0-6.8 4.71 4.71 0 0 1 6.72 0L12 7.49l.38-.39a4.71 4.71 0 0 1 6.72 0 4.78 4.78 0 0 1 0 6.8L12 20.5Z"
        fill={isLiked ? '#dc2626' : 'rgba(255,255,255,0.9)'}
        stroke={isLiked ? '#dc2626' : '#ffffff'}
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default function PhotoViewer({
  photo,
  canLikePhotos = false,
  onClose,
  onCommentClick,
  onLikeClick,
}) {
  useEffect(() => {
    if (!photo) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [photo, onClose])

  if (!photo) return null

  const isLiked = Boolean(photo.likedByCurrentVisitor)
  const likesCount = Number(photo.likesCount) || 0
  const commentsCount = Number(photo.commentsCount) || 0

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close photo viewer"
        onClick={onClose}
        className="fixed right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white backdrop-blur-md active:scale-95"
      >
        ×
      </button>

      <div
        className="relative max-h-full max-w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={photo.src}
          alt={photo.alt ?? 'Selected photo'}
          className="max-h-[calc(100vh-2rem)] max-w-full select-none rounded-2xl object-contain"
          draggable={false}
        />

        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-sm font-semibold transition active:scale-95 disabled:opacity-45"
            disabled={!canLikePhotos}
            onClick={() => onLikeClick?.(photo)}
            aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
          >
            <HeartIcon isLiked={isLiked} />
            {likesCount > 0 ? <span>{likesCount}</span> : null}
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-sm font-semibold transition active:scale-95"
            onClick={() => {
              onClose?.()
              window.setTimeout(() => {
                onCommentClick?.(photo)
              }, 0)
            }}
            aria-label="Open comments"
          >
            <CommentIcon />
            {commentsCount > 0 ? <span>{commentsCount}</span> : null}
          </button>
        </div>
      </div>
    </div>
  )
}
