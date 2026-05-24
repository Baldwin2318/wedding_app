import { useState } from 'react'

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
    likes: 12,
    author: 'Ava',
  },
  {
    id: 'dummy-2',
    image: createPlaceholderImage('#6d8ec5', '#9dd6c8', 'Ceremony Smile'),
    caption: 'Everyone looked so happy during the ceremony.',
    likes: 19,
    author: 'Noah',
  },
  {
    id: 'dummy-3',
    image: createPlaceholderImage('#7f5f95', '#d9a7c7', 'Golden Hour'),
    caption: 'Golden hour hit perfectly for this memory.',
    likes: 27,
    author: 'Mia',
  },
]

function NewsFeed({ photos = [], onAddPhoto }) {
  const [likedPosts, setLikedPosts] = useState({})
  const posts = [...photos, ...dummyPosts]

  function handleToggleLike(postId) {
    setLikedPosts((currentLikedPosts) => ({
      ...currentLikedPosts,
      [postId]: !currentLikedPosts[postId],
    }))
  }

  return (
    <section className="h-screen w-full overflow-hidden bg-stone-100 p-6 sm:p-3">
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-[780px] min-h-0 flex-col overflow-hidden rounded-[28px] border border-zinc-950 bg-amber-50 sm:h-[calc(100vh-1.5rem)] sm:rounded-[20px]">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-950 px-6 py-5 sm:flex-col sm:items-start sm:px-4 sm:py-4">
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            News Feed
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-2.5 rounded-full border border-zinc-950 bg-zinc-950 px-4.5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-950"
            onClick={onAddPhoto}
          >
            <span aria-hidden="true">📷</span>
            <span>Add photo</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable] sm:p-3.5">
          {posts.map((post) => {
            const isLiked = Boolean(likedPosts[post.id])
            const likeCount = post.likes + (isLiked ? 1 : 0)

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
                      onClick={() => handleToggleLike(post.id)}
                      aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                    >
                      <span aria-hidden="true">♥</span>
                      <span>{likeCount}</span>
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
