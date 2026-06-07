import { useEffect, useRef, useState } from 'react'
import MinimalCameraIcon from './MinimalCameraIcon'
import HeartMark from './HeartMark'
import PhotoViewer from './PhotoViewer'
import ProfileAvatar from './ProfileAvatar'
import ProfileView from './ProfileView'
import useBrowserBackStack from '../hooks/useBrowserBackStack'
import ProfileSettings from './ProfileSettings'
import { saveProfile } from '../lib/saveProfile'
import FeedSkeletonCard from './FeedSkeletonCard'
import VerifiedBadge from './VerifiedBadge'
import CommentIcon from './CommentIcon'
import CommentsSheet, { formatRelativeTime } from './CommentsSheet'
import LikesSheet from './LikesSheet'
import MembersView from './MembersView'
import { fetchMembers } from '../lib/fetchMembers'

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

export default function NewsFeed() { return null }
