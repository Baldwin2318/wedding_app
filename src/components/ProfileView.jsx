import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'

function PencilIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10-10-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m12.5 7.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function getPostAuthorKey(post) {
  return String(post?.authorId || post?.userId || post?.author || '').trim().toLowerCase()
}

function getProfileImage(post) {
  return post?.profileImage || post?.profilePhoto || post?.avatar || post?.authorAvatar || ''
}

function ProfileView({
  profile,
  posts = [],
  onBack,
  onSelectPhoto,
  canEditProfile = false,
  onEditProfile,
}) {
  if (!profile) {
    return null
  }

  const profileKey = getPostAuthorKey(profile)
  const userPosts = posts.filter((post) => getPostAuthorKey(post) === profileKey)
  const profileName = profile.author || profile.name || 'Guest'
  const profileImage = getProfileImage(profile)
  const isVerified = Boolean(profile.verified)

  return (
    <section className="fixed inset-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-zinc-50">
      <header className="shrink-0 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[520px] items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-zinc-950 transition active:scale-95 hover:text-zinc-500"
            onClick={onBack}
            aria-label="Back to feed"
          >
            ‹
          </button>
            <h1 className="flex min-w-0 items-center gap-1.5 text-base font-semibold text-zinc-950">
              <span className="truncate">{profileName}</span>
              {isVerified ? <VerifiedBadge /> : null}
            </h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-[520px]">
          <div className="rounded-[32px] border border-white bg-white px-5 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-5">
              <ProfileAvatar src={profileImage} name={profileName} className="h-20 w-20" />
              <div className="min-w-0 flex-1">
                <h2 className="flex min-w-0 items-center gap-2 text-2xl font-semibold text-zinc-950">
                  <span className="truncate">{profileName}</span>
                  {isVerified ? (
                    <VerifiedBadge className="h-[19px] w-[19px]" checkClassName="h-[13px] w-[13px]" />
                  ) : null}
                </h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  {userPosts.length === 1 ? '1 post' : `${userPosts.length} posts`}
                </p>
              </div>
              {canEditProfile ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-sm transition hover:bg-zinc-100 active:scale-95"
                  onClick={onEditProfile}
                  aria-label="Edit profile"
                >
                  <PencilIcon />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-1 overflow-hidden rounded-3xl bg-zinc-200">
            {userPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                className="aspect-square bg-zinc-100"
                onClick={() =>
                  onSelectPhoto?.({
                    ...post,
                    src: post.image,
                    alt: post.caption ?? `${profileName} photo`,
                  })
                }
                aria-label={post.caption ?? `${profileName} photo`}
              >
                <img
                  className="h-full w-full object-cover transition active:scale-[0.98]"
                  src={post.image}
                  alt=""
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {userPosts.length === 0 ? (
            <p className="mt-8 text-center text-sm text-zinc-500">
              No posts from this guest yet.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default ProfileView
