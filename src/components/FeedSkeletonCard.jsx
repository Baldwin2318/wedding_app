function FeedSkeletonCard() {
  return (
    <article
      className="mx-auto my-4 w-full max-w-[520px] overflow-hidden rounded-3xl border border-white bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
      aria-hidden="true"
    >
      <div className="aspect-[4/5] w-full animate-pulse bg-zinc-200" />
      <div className="space-y-4 px-[18px] pt-4 pb-[18px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-zinc-200" />
            <div className="h-4 w-28 animate-pulse rounded-full bg-zinc-200" />
          </div>
          <div className="h-8 w-14 animate-pulse rounded-full bg-zinc-200" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-4 w-7/12 animate-pulse rounded-full bg-zinc-200" />
        </div>
      </div>
    </article>
  )
}

export default FeedSkeletonCard
