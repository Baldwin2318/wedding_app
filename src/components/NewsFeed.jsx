import { useRef, useState } from 'react'

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

function NewsFeed({ photos = [], onAddPhoto, onTogglePhotoLike, onUploadPhoto }) {
  const [likedPosts, setLikedPosts] = useState({})
  const [likingPostIds, setLikingPostIds] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
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

  return (
    <section className="h-screen w-full p-6 sm:p-3">
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-[780px] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-950 px-6 py-5 sm:flex-col sm:items-start sm:px-4 sm:py-4">
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

        <div className="min-h-0 flex-1 space-y-4 p-5 [scrollbar-gutter:stable] sm:p-3.5">
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
