import { useEffect, useRef, useState } from 'react'
import MinimalCameraIcon from './MinimalCameraIcon'
import HeartMark from './HeartMark'
import { useState } from "react";
import PhotoViewer from "./PhotoViewer";

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
        fill={isLiked ? '#dc2626' : '#ffffff'}
        stroke={isLiked ? '#dc2626' : '#111827'}
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
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
  hasMorePhotos = false,
  isInitialLoadingPhotos = false,
  isLoadingMorePhotos = false,
  photos = [],
  onAddPhoto,
  onLoadNewPhotos,
  onLoadMorePhotos,
  onRefreshPhotos,
  onTogglePhotoLike,
  onUploadPhoto,
  pendingNewPhotoCount = 0,
  requestPhotoAccess,
  showAccessTip = false,
  accessCodeError = '',
  isVerifyingAccessCode = false,
  onAccessClick,
  onCloseAccessTip,
}) {
  const uploadCaptionFieldRef = useRef(null)
  const [likedPosts, setLikedPosts] = useState({})
  const [likingPostIds, setLikingPostIds] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [selectedUploadCaption, setSelectedUploadCaption] = useState('')
  const [selectedUploadFile, setSelectedUploadFile] = useState(null)
  const [selectedUploadPreviewUrl, setSelectedUploadPreviewUrl] = useState('')
  const fileInputRef = useRef(null)
  const isRequestingMoreRef = useRef(false)
  const scrollContainerRef = useRef(null)
  const touchStartYRef = useRef(null)
  const wheelPullDistanceRef = useRef(0)
  const wheelResetTimeoutRef = useRef(null)
//   const posts = [...photos, ...dummyPosts]
  const posts = [...photos]
  const [optimisticLikes, setOptimisticLikes] = useState({})
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    return () => {
      if (selectedUploadPreviewUrl) {
        URL.revokeObjectURL(selectedUploadPreviewUrl)
      }
    }
  }, [selectedUploadPreviewUrl])

  function handleToggleDummyLike(postId) {
    setLikedPosts((currentLikedPosts) => ({
      ...currentLikedPosts,
      [postId]: !currentLikedPosts[postId],
    }))
  }

  async function handleLike(postId, isPersistedPhoto, currentIsLiked, currentLikeCount) {
    const nextIsLiked = !currentIsLiked
    const nextLikeCount = Math.max(0, currentLikeCount + (nextIsLiked ? 1 : -1))
  
    setOptimisticLikes((current) => ({
      ...current,
      [postId]: {
        isLiked: nextIsLiked,
        likesCount: nextLikeCount,
      },
    }))
  
    if (!isPersistedPhoto || !onTogglePhotoLike) {
      return
    }
  
    try {
      await onTogglePhotoLike(postId, nextIsLiked)
    } catch (error) {
      console.error('Failed to like photo:', error)
  
      setOptimisticLikes((current) => ({
        ...current,
        [postId]: {
          isLiked: currentIsLiked,
          likesCount: currentLikeCount,
        },
      }))
    }
  }

  function handleOpenUploadPicker() {
    requestPhotoAccess(() => fileInputRef.current?.click())
  }

  function handleOpenCamera() {
    onAddPhoto?.()
  }

  function clearSelectedUpload() {
    if (selectedUploadPreviewUrl) {
      URL.revokeObjectURL(selectedUploadPreviewUrl)
    }

    setSelectedUploadFile(null)
    setSelectedUploadCaption('')
    setSelectedUploadPreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file || !onUploadPhoto || isUploading) {
      event.target.value = ''
      return
    }

    if (selectedUploadPreviewUrl) {
      URL.revokeObjectURL(selectedUploadPreviewUrl)
    }

    setSelectedUploadFile(file)
    setSelectedUploadCaption('')
    setSelectedUploadPreviewUrl(URL.createObjectURL(file))
    event.target.value = ''
  }

  async function handleConfirmUpload() {
    if (!selectedUploadFile || !onUploadPhoto || isUploading) {
      return
    }

    try {
      setIsUploading(true)
      await onUploadPhoto(selectedUploadFile, selectedUploadCaption.trim())
      clearSelectedUpload()
    } catch (error) {
      console.error('Failed to upload selected photo:', error)
    } finally {
      setIsUploading(false)
    }
  }

  function handleUploadCaptionFocus() {
    setTimeout(() => {
      uploadCaptionFieldRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 120)
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

  function handleScroll(event) {
    const element = event.currentTarget

    if (
      !hasMorePhotos ||
      isLoadingMorePhotos ||
      isInitialLoadingPhotos ||
      isRequestingMoreRef.current
    ) {
      return
    }

    const remainingScrollDistance =
      element.scrollHeight - element.scrollTop - element.clientHeight

    if (remainingScrollDistance <= 240) {
      isRequestingMoreRef.current = true
      onLoadMorePhotos?.()
    }
  }

  useEffect(() => {
    if (!isLoadingMorePhotos) {
      isRequestingMoreRef.current = false
    }
  }, [isLoadingMorePhotos])
  
  return (
    <section className="fixed inset-0 flex min-h-0 w-full flex-col overflow-hidden bg-zinc-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
       <div className="top-0 z-10 shrink-0 border-b border-zinc-200/80 bg-white/85 px-5 py-4 backdrop-blur-xl sm:px-4">
        <div className="relative mx-auto flex w-full max-w-[520px] items-center justify-between gap-4">
          <h1 className="title-cursive m-0 text-2xl font-semibold text-zinc-950 sm:text-[1.35rem]">
            Happy Memories 🌺
          </h1>
    
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition hover:bg-zinc-200"
              onClick={handleOpenUploadPicker}
              disabled={isUploading}
              aria-label="Add photo"
            >
              +
            </button>
    
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition hover:bg-zinc-200"
              onClick={handleOpenCamera}
              aria-label="Take picture"
            >
              <MinimalCameraIcon className="h-5 w-5" />
            </button>
          </div>
    
          {showAccessTip ? (
            <div className="absolute right-0 top-14 z-20 w-64 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-xl">
              <p className="mb-3 text-zinc-700">
                Uploading and taking pictures are restricted.
              </p>
    
              {accessCodeError ? (
                <p className="mb-3 text-xs font-medium text-red-600">
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
        </div>
       </div>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain space-y-4 bg-zinc-50 px-5 pt-5 pb-6 [scrollbar-gutter:stable] sm:px-4 sm:pt-4"
          onScroll={handleScroll}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
          onWheel={handleWheel}
        >
          {/* {isInitialLoadingPhotos ? (
            <div className="mx-auto w-full max-w-[520px] rounded-3xl border border-zinc-950 bg-white px-4 py-6 text-center text-sm text-zinc-600">
              Loading photos...
            </div>
          ) : null} */}

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
            const optimisticLike = optimisticLikes[post.id]
            
            const baseIsLiked = isPersistedPhoto
              ? Boolean(post.likedByCurrentVisitor)
              : false
            
            const baseLikeCount = Number(post.likesCount) || 0
            
            const isLiked = optimisticLike?.isLiked ?? baseIsLiked
            const likeCount = optimisticLike?.likesCount ?? baseLikeCount
            const showLikeCount = likeCount > 0

            return (
                <article
                  key={post.id}
                  className="mx-auto my-4 w-full max-w-[520px] overflow-hidden rounded-3xl border border-white bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
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
                      className="inline-flex items-center gap-2 bg-transparent px-1 py-1 text-sm font-medium text-zinc-950 transition hover:opacity-80"
                      onClick={() => handleLike(post.id, isPersistedPhoto, isLiked, likeCount)}
                      aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                    >
                      <HeartIcon isLiked={isLiked} />
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

          {isLoadingMorePhotos ? (
            <div className="mx-auto w-full max-w-[520px] px-4 py-3 text-center text-sm text-zinc-500">
              Loading more photos...
            </div>
          ) : null}

          <footer className="mx-auto mt-8 mb-6 max-w-[520px] px-6 text-center">
            <p className="text-sm text-zinc-500 italic">
              Developed by Baldwin
            </p>
          </footer>
        </div>
      </div>

      {selectedUploadFile ? (
        <div className="keyboard-safe-bottom absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-4 py-6 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-[420px] overflow-hidden rounded-[28px] border border-zinc-950 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.18)]">
            {selectedUploadPreviewUrl ? (
              <img
                className="block max-h-[280px] w-full bg-stone-100 object-cover"
                src={selectedUploadPreviewUrl}
                alt="Selected upload preview"
              />
            ) : null}
            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-zinc-950">
                  Add a caption
                </h2>
                <p className="text-sm text-zinc-600">
                  Write a short note before uploading this photo.
                </p>
              </div>

              <textarea
                ref={uploadCaptionFieldRef}
                id="upload-caption"
                className="w-full rounded-2xl border border-zinc-950 bg-white px-3.5 py-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                rows="4"
                placeholder="Write a short note about this photo..."
                value={selectedUploadCaption}
                onChange={(event) => setSelectedUploadCaption(event.target.value)}
                onFocus={handleUploadCaptionFocus}
              />

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-zinc-950 bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
                  onClick={clearSelectedUpload}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PhotoViewer
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </section>
  )
}

export default NewsFeed
