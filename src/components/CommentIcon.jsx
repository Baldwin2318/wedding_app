function CommentIcon({ className = 'h-6 w-6' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M20.25 11.35c0 4.05-3.64 7.35-8.13 7.35-.86 0-1.69-.12-2.47-.36L4.5 20.25l1.58-4.05a6.78 6.78 0 0 1-2.2-4.85C3.88 7.3 7.52 4 12.12 4s8.13 3.3 8.13 7.35Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default CommentIcon
