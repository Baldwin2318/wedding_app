function MinimalCameraIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.75 7.75h2.31l1.19-1.75h7.5l1.19 1.75h2.31A1.75 1.75 0 0 1 21 9.5v7.75A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V9.5A1.75 1.75 0 0 1 4.75 7.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="13.25"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export default MinimalCameraIcon
