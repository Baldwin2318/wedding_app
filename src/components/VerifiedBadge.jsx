function VerifiedBadge({ className = 'h-[16px] w-[16px]', checkClassName = 'h-[11px] w-[11px]' }) {
  return (
    <span
      aria-label="Verified"
      title="Verified"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#0095F6] text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] ring-[1.5px] ring-white ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={checkClassName}
        fill="none"
      >
        <path
          d="M6.75 12.35 10.05 15.65 17.25 8.45"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.4"
        />
      </svg>
    </span>
  )
}

export default VerifiedBadge
