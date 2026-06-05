import { useEffect, useMemo, useRef, useState } from 'react'
import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'

function formatCommentTime(value) {
  if (!value) return ''

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) return ''

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))

  if (seconds < 60) return 'now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

function CommentRow({ comment, onEdit, onDelete }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <ProfileAvatar
        src={comment.authorProfileImageUrl}
        name={comment.authorName}
        className="h-9 w-9"
      />

      <div className="min-w-0 flex-1">
        <div className="text-sm leading-5 text-zinc-950">
          <span className="inline-flex max-w-full items-center gap-1.5 align-baseline font-semibold">
            <span className="truncate">{comment.authorName || 'Guest'}</span>
            {comment.authorVerified ? <VerifiedBadge className="h-[14px] w-[14px]" checkClassName="h-[9px] w-[9px]" /> : null}
          </span>{' '}
          <span className="break-words">{comment.body}</span>
        </div>

        <div className="mt-1 flex items-center gap-4 text-xs font-medium text-zinc-500">
          <span>{formatCommentTime(comment.createdAt)}</span>

          {comment.ownedByCurrentVisitor ? (
            <>
              <button type="button" onClick={() => onEdit(comment)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(comment)}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CommentsSheet({
  post,
  comments = [],
  isLoading = false,
  isSubmitting = false,
  error = '',
  canComment = false,
  currentProfile = null,
  onClose,
  onSubmit,
  onEdit,
  onDelete,
}) {
  const [draft, setDraft] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const inputRef = useRef(null)
  
  const trimmedDraft = draft.trim()
  const title = useMemo(() => {
    const count = comments.length

    return count === 1 ? '1 comment' : `${count} comments`
  }, [comments.length])

  useEffect(() => {
    setDraft('')
    setEditingComment(null)
  }, [post?.id])


  if (!post) {
    return null
  }
  
  function beginEdit(comment) {
    setEditingComment(comment)
    setDraft(comment.body || '')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function cancelEdit() {
    setEditingComment(null)
    setDraft('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!trimmedDraft || isSubmitting) {
      return
    }

    if (editingComment) {
      await onEdit?.(editingComment.id, trimmedDraft)
      cancelEdit()
      return
    }

    await onSubmit?.(trimmedDraft)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close comments"
        className="absolute inset-0"
        onClick={onClose}
      />

      <section className="relative flex max-h-[calc(100dvh-3rem)] min-h-[52vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <header className="relative shrink-0 border-b border-zinc-200 px-12 py-3 text-center">
          <h2 className="truncate text-base font-semibold text-zinc-950">{title}</h2>
        
          <button
            type="button"
            aria-label="Close comments"
            onClick={onClose}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-100 text-2xl leading-none text-zinc-950 transition hover:bg-zinc-200 active:scale-95"
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

          {!isLoading && comments.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center px-8 text-center">
              <p className="text-base font-semibold text-zinc-950">
                No comments yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Start the conversation.
              </p>
            </div>
          ) : null}

          {!isLoading
            ? comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  onEdit={beginEdit}
                  onDelete={onDelete}
                />
              ))
            : null}
        </div>

        {error ? (
          <p className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-600">
            {error}
          </p>
        ) : null}

        {editingComment ? (
          <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600">
            <span>Editing comment</span>
            <button type="button" className="text-zinc-950" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        ) : null}

        <form
          className="keyboard-safe-bottom flex shrink-0 items-center gap-3 border-t border-zinc-200 bg-white px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          onSubmit={handleSubmit}
        >
          <ProfileAvatar
            src={currentProfile?.urlProfilePic || ''}
            name={currentProfile?.name || 'Guest'}
            className="h-9 w-9"
          />

          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!canComment || isSubmitting}
            maxLength={500}
            className="min-w-0 flex-1 rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={canComment ? 'Add a comment...' : 'Login to comment'}
          />

          <button
            type="submit"
            disabled={!canComment || !trimmedDraft || isSubmitting}
            className="shrink-0 text-sm font-semibold text-[#0095F6] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {editingComment ? 'Save' : 'Post'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default CommentsSheet
