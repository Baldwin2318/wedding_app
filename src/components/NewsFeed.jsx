import { useRef, useState } from 'react'

const PULL_TO_REFRESH_THRESHOLD = 80

function createPlaceholderImage(topColor, bottomColor, label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${topColor}" />
          <stop offset="100%" stop-color="${bottomColor}" />
        </linearGradient>
      </defs>
      <rect width="800" height="560" fill="url(#g)" />
      <circle cx="140" cy="120" r="34" fill="rgba(255,255,255,0.4)" />
      <circle cx="650" cy="420" r="52" fill="rgba(255,255,255,0.18)" />
      <text x="50%" y="50%" text-anchor="middle" fill="#ffffff" font-size="42" font-family="Arial, sans-serif">
        ${label}
      </text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const dummyPosts = [
  {
    id: 'dummy-1',
    image: createPlaceholderImage('#d9736a', '#f3c17b', 'Reception Memory'),
    caption: 'A sweet table moment before the dancing started.',
    likesCount: 12,
    author: 'Ava',
  },
  {
    id: 'dummy-2',
    image: createPlaceholderImage('#6d8ec5', '#9dd6c8', 'Ceremony Smile'),
    caption: 'Everyone looked so happy during the ceremony.',
    likesCount: 19,
    author: 'Noah',
  },
  {
    id: 'dummy-3',
    image: createPlaceholderImage('#7f5f95', '#d9a7c7', 'Golden Hour'),
    caption: 'Golden hour hit perfectly for this memory.',
    likesCount: 27,
    author: 'Mia',
  },
]

function NewsFeed({
  photos = [],
  onAddPhoto,
  onLoadNewPhotos,
  onRefreshPhotos,
  onTogglePhotoLike,
  onUploadPhoto,
  pendingNewPhotoCount = 0,
}) {
  const [likedPosts, setLikedPosts] = useState({})
  const [likingPostIds, setLikingPostIds] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const fileInputRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const touchStartYRef = useRef(null)
  const wheelPullDistanceRef = useRef(0)
  const wheelResetTimeoutRef = useRef(null)
  const posts = [...photos, ...dummyPosts]

  function handleToggleDummyLike(postId) {
    setLikedPosts((currentLikedPosts) => ({
      ...currentLikedPosts,
      [postId]: !currentLikedPosts[postId],
    }))
  }

  async function handleLike(postId, isPersistedPhoto, isLiked) {
    if (!isPersistedPhoto || !onTogglePhotoLike) {
      handleToggleDummyLike(postId)
      return
    }

    if (likingPostIds[postId]) {
      return
    }

    try {
      setLikingPostIds((currentIds) => ({
        ...currentIds,
        [postId]: true,
      }))
      await onTogglePhotoLike(postId, !isLiked)
    } catch (error) {
      console.error('Failed to like photo:', error)
    } finally {
      setLikingPostIds((currentIds) => {
        const nextIds = { ...currentIds }
        delete nextIds[postId]
        return nextIds
      })
    }
  }

  function handleOpenUploadPicker() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file || !onUploadPhoto || isUploading) {
      event.target.value = ''
      return
    }

    try {
      setIsUploading(true)
      await onUploadPhoto(file)
    } catch (error) {
      console.error('Failed to upload selected photo:', error)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  function isAtTop() {
    return (scrollContainerRef.current?.scrollTop || 0) <= 0
  }

  async function triggerRefresh() {
    if (!onRefreshPhotos || isRefreshing) {
      setPullDistance(0)
      return
    }

    try {
      setIsRefreshing(true)
      await onRefreshPhotos()
    } catch (error) {
      console.error('Failed to refresh feed photos:', error)
    } finally {
      touchStartYRef.current = null
      wheelPullDistanceRef.current = 0
      setPullDistance(0)
      setIsRefreshing(false)
    }
  }

  function handleTouchStart(event) {
    if (!isAtTop()) {
      touchStartYRef.current = null
      return
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null
  }

  function handleTouchMove(event) {
    if (touchStartYRef.current === null || !isAtTop()) {
      return
    }

    const currentY = event.touches[0]?.clientY ?? touchStartYRef.current
    const nextPullDistance = Math.max(0, Math.min(currentY - touchStartYRef.current, 120))
    setPullDistance(nextPullDistance)
  }

  function handleTouchEnd() {
    if (pullDistance >= PULL_TO_REFRESH_THRESHOLD) {
      triggerRefresh()
      return
    }

    touchStartYRef.current = null
    setPullDistance(0)
  }

  function scheduleWheelReset() {
    if (wheelResetTimeoutRef.current) {
      clearTimeout(wheelResetTimeoutRef.current)
    }

    wheelResetTimeoutRef.current = setTimeout(() => {
      wheelPullDistanceRef.current = 0
      setPullDistance(0)
    }, 120)
  }

  function handleWheel(event) {
    if (!onRefreshPhotos || isRefreshing) {
      return
    }

    if (!isAtTop()) {
      wheelPullDistanceRef.current = 0
      setPullDistance(0)
      return
    }

    if (event.deltaY < 0) {
      wheelPullDistanceRef.current = Math.min(
        wheelPullDistanceRef.current + Math.abs(event.deltaY),
        120,
      )
      setPullDistance(wheelPullDistanceRef.current)

      if (wheelPullDistanceRef.current >= PULL_TO_REFRESH_THRESHOLD) {
        triggerRefresh()
        return
      }

      scheduleWheelReset()
      return
    }

    wheelPullDistanceRef.current = 0
    setPullDistance(0)
  }

  return (
    <section className="h-screen w-full p-6 sm:p-3">
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-[780px] min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-zinc-950 bg-white px-6 py-5 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-start">
          <h1 className="title-cursive m-0 text-5xl text-zinc-950 sm:text-2xl">
            Happy Memories 🌺
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-full border border-zinc-950 bg-white px-4.5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
              onClick={handleOpenUploadPicker}
              disabled={isUploading}
            >
              <span aria-hidden="true">↑</span>
              <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-full border border-zinc-950 bg-zinc-950 px-4.5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
              onClick={onAddPhoto}
            >
              <span aria-hidden="true">📷</span>
              <span>Add photo</span>
            </button>
          </div>
        </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain space-y-4 p-5 [scrollbar-gutter:stable] sm:p-3.5"
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
          onWheel={handleWheel}
        >
          {onRefreshPhotos ? (
            <div
              className="mx-auto flex w-full max-w-[520px] items-center justify-center overflow-hidden text-sm font-medium text-zinc-500 transition-all"
              style={{
                height:
                  pullDistance > 0 || isRefreshing
                    ? `${Math.max(pullDistance * 0.7, 28)}px`
                    : '0px',
                opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
              }}
            >
              {isRefreshing ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950"
                  />
                  <span>Refreshing photos...</span>
                </span>
              ) : (
                <span>
                  {pullDistance >= PULL_TO_REFRESH_THRESHOLD
                    ? 'Release to refresh'
                    : 'Pull down to refresh'}
                </span>
              )}
            </div>
          ) : null}

          {pendingNewPhotoCount > 0 ? (
            <div className="mx-auto w-full max-w-[520px]">
              <button
                type="button"
                className="w-full rounded-full border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
                onClick={onLoadNewPhotos}
              >
                {pendingNewPhotoCount === 1
                  ? '1 new upload'
                  : `${pendingNewPhotoCount}+ new uploads`}
              </button>
            </div>
          ) : null}

          {posts.map((post) => {
            const isPersistedPhoto = photos.some((photo) => photo.id === post.id)
            const isLiked = isPersistedPhoto
              ? Boolean(post.likedByCurrentVisitor)
              : Boolean(likedPosts[post.id])
            const likeCount = isPersistedPhoto
              ? Number(post.likesCount) || 0
              : (Number(post.likesCount) || 0) + (isLiked ? 1 : 0)
            const showLikeCount = likeCount > 0

            return (
              <article
                key={post.id}
                className="mx-auto w-full max-w-[520px] overflow-hidden rounded-3xl border border-zinc-950 bg-white"
              >
                <img
                  className="block w-full bg-stone-200"
                  src={post.image}
                  alt={post.caption}
                />

                <div className="px-[18px] pt-4 pb-[18px]">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{post.author}</strong>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 rounded-full border border-zinc-950 px-3 py-2 text-sm font-medium transition ${
                        isLiked
                          ? 'bg-zinc-950 text-white'
                          : 'bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white'
                      }`}
                      onClick={() => handleLike(post.id, isPersistedPhoto, isLiked)}
                      aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                      disabled={Boolean(likingPostIds[post.id])}
                    >
                      <span aria-hidden="true">♥</span>
                      {showLikeCount ? <span>{likeCount}</span> : null}
                    </button>
                  </div>

                  <p className="mt-3.5 text-left text-base leading-7 text-zinc-700">
                    {post.caption}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default NewsFeed
