import { useEffect, useState } from 'react'
import CommentIcon from './CommentIcon'
import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'
import { formatRelativeTime } from './CommentsSheet'

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
  canDeletePhoto = false,
  isDeletingPhoto = false,
  onClose,
  onCommentClick,
  onLikeClick,
  onDeleteClick,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  useEffect(() => {
    setIsMenuOpen(false)
  }, [photo?.id])

  if (!photo) return null

  const isLiked = Boolean(photo.likedByCurrentVisitor)
  const likesCount = Number(photo.likesCount) || 0
  const commentsCount = Number(photo.commentsCount) || 0
  const authorName = photo.author || 'Guest'
  const isVerified = Boolean(photo.verified)
  const postTime = formatRelativeTime(photo.createdAt)
  const authorProfileImage =
    photo.profileImage || photo.profilePhoto || photo.avatar || photo.authorAvatar || ''

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
        {canDeletePhoto ? (
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label="Open photo actions"
              aria-expanded={isMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white backdrop-blur-md active:scale-95 disabled:opacity-45"
              disabled={isDeletingPhoto}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              ⋯
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-13 min-w-[160px] overflow-hidden rounded-2xl border border-white/10 bg-white text-sm shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeletingPhoto}
                  onClick={() => {
                    setIsMenuOpen(false)
                    onDeleteClick?.(photo)
                  }}
                >
                  {isDeletingPhoto ? 'Deleting...' : 'Delete photo'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Close photo viewer"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white backdrop-blur-md active:scale-95"
        >
          ×
        </button>
      </div>

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

        <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-8rem)] items-center gap-2 rounded-full px-2 py-2 text-white">
          <ProfileAvatar
            src={authorProfileImage}
            name={authorName}
            className="h-8 w-8 bg-transparent p-0 shadow-none ring-0"
          />
          <div className="min-w-0 pr-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
                {authorName}
              </span>
              {isVerified ? (
                <VerifiedBadge className="h-[14px] w-[14px]" checkClassName="h-[9px] w-[9px]" />
              ) : null}
            </div>
            {postTime ? (
              <p className="mt-0.5 truncate text-[11px] font-medium text-white/70">
                {postTime} ago
              </p>
            ) : null}
          </div>
        </div>

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
