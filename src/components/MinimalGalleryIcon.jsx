function MinimalGalleryIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3.75"
        y="5.25"
        width="16.5"
        height="13.5"
        rx="2"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="10" r="1.25" fill="currentColor" />
      <path
        d="m7 16 3.25-3.25a1 1 0 0 1 1.41 0L14 15l1.75-1.75a1 1 0 0 1 1.41 0L19 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export default MinimalGalleryIcon
