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

function MenuIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AccountIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MembersIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15 10a2.5 2.5 0 1 0 0-5M3.5 20a5.5 5.5 0 0 1 11 0M14.5 20a4.5 4.5 0 0 1 6-4.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4M15 8l4 4-4 4M8 12h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  onLoadPhotoComments,
  onLoadPhotoLikes,
  onAddPhotoComment,
  onUpdatePhotoComment,
  onDeletePhotoComment,
  onUploadPhoto,
  pendingNewPhotoCount = 0,
  requestPhotoAccess,
  showAccessTip = false,
  accessCodeError = '',
  accessCodeErrorVisible = false,
  isVerifyingAccessCode = false,
  onAccessClick,
  onCloseAccessTip,
  onGoHome,
  currentProfile = null,
  hasVerifiedAccess = false,
  canEditProfile = false,
  canLikePhotos = false,
  canUploadPhotos = false,
  onProfileUpdated,
  onLogout,
  accessCodeInput = '',
  onAccessCodeInputChange,
  onDeletePhoto,
  onTogglePhotoCommentLike,
  onLoadPhotoCommentLikes,
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
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')
  const { pushView } = useBrowserBackStack()
  const uploadHistoryDisposeRef = useRef(null)
  const profileHistoryDisposeRef = useRef(null)
  const photoHistoryDisposeRef = useRef(null)
  const profileSettingsHistoryDisposeRef = useRef(null)
  const commentsHistoryDisposeRef = useRef(null)
  const likesHistoryDisposeRef = useRef(null)
  const [commentSheetPost, setCommentSheetPost] = useState(null)
  const [likesSheetPost, setLikesSheetPost] = useState(null)
  const [commentsByPhotoId, setCommentsByPhotoId] = useState({})
  const [likesByPhotoId, setLikesByPhotoId] = useState({})
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isLoadingLikes, setIsLoadingLikes] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [likesError, setLikesError] = useState('')
  const [deletingPostIds, setDeletingPostIds] = useState({})
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [members, setMembers] = useState([])
  const [commentLikesSheet, setCommentLikesSheet] = useState(null)
  const [commentLikesById, setCommentLikesById] = useState({})
  const [isLoadingCommentLikes, setIsLoadingCommentLikes] = useState(false)
  const [commentLikesError, setCommentLikesError] = useState('')

  useEffect(() => {
    if (!hasVerifiedAccess) {
      setMembers([])
      return
    }

    let isCancelled = false

    async function loadMembers() {
      try {
        const profiles = await fetchMembers()

        if (isCancelled) {
          return
        }

        setMembers(
          profiles.map((profile) => ({
            id: String(profile.id || profile.uuid),
            authorId: profile.uuid,
            author: profile.name || 'Guest',
            profileImage: profile.urlProfilePic || '',
            verified: Boolean(profile.verified),
            lastActiveAt: profile.lastActiveAt || '',
          })),
        )
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load members:', error)
          setMembers([])
        }
      }
    }

    loadMembers()

    return () => {
      isCancelled = true
    }
  }, [hasVerifiedAccess])

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
    if (likingPostIds[postId]) {
      return
    }

    const nextIsLiked = !currentIsLiked
    const nextLikeCount = Math.max(0, currentLikeCount + (nextIsLiked ? 1 : -1))

    setLikingPostIds((current) => ({
      ...current,
      [postId]: true,
    }))
  
    setOptimisticLikes((current) => ({
      ...current,
      [postId]: {
        isLiked: nextIsLiked,
        likesCount: nextLikeCount,
      },
    }))
  
    if (!isPersistedPhoto || !onTogglePhotoLike) {
      setLikingPostIds((current) => {
        const next = { ...current }
        delete next[postId]
        return next
      })
      return
    }
  
    try {
      await onTogglePhotoLike(postId, nextIsLiked)

      setOptimisticLikes((current) => {
        const next = { ...current }
        delete next[postId]
        return next
      })
    } catch (error) {
      console.error('Failed to like photo:', error)
  
      setOptimisticLikes((current) => ({
        ...current,
        [postId]: {
          isLiked: currentIsLiked,
          likesCount: currentLikeCount,
        },
      }))
    } finally {
      setLikingPostIds((current) => {
        const next = { ...current }
        delete next[postId]
        return next
      })
    }
  }

  function handleOpenUploadPicker() {
    requestPhotoAccess(() => fileInputRef.current?.click())
  }

  function handleOpenCamera() {
    onAddPhoto?.()
  }

  function openProfile(post) {
    setSelectedProfile(post)
  }

  function openProfileFromLikes(likeProfile) {
    setLikesSheetPost(null)
    setLikesError('')
    setCommentSheetPost(null)
    setSelectedProfile(likeProfile)
  }

  function openProfileSettings() {
    setProfileSaveError('')
    setIsProfileSettingsOpen(true)
  }

  function closeSelectedPhoto() {
    if (photoHistoryDisposeRef.current) {
      const dispose = photoHistoryDisposeRef.current
      photoHistoryDisposeRef.current = null
      dispose()
      return
    }

    setSelectedPhoto(null)
  }
  
  function closeCommentsSheet() {
    if (commentsHistoryDisposeRef.current) {
      const dispose = commentsHistoryDisposeRef.current
      commentsHistoryDisposeRef.current = null
      dispose()
      return
    }
  
    setCommentSheetPost(null)
  }

  function closeLikesSheet() {
    if (likesHistoryDisposeRef.current) {
      const dispose = likesHistoryDisposeRef.current
      likesHistoryDisposeRef.current = null
      dispose()
      return
    }

    setLikesSheetPost(null)
    setLikesError('')
  }

  function closeSelectedProfile() {
    if (profileHistoryDisposeRef.current) {
      const dispose = profileHistoryDisposeRef.current
      profileHistoryDisposeRef.current = null
      dispose()
      return
    }

    setSelectedProfile(null)
  }

  function closeProfileSettings() {
    if (profileSettingsHistoryDisposeRef.current) {
      const dispose = profileSettingsHistoryDisposeRef.current
      profileSettingsHistoryDisposeRef.current = null
      dispose()
      return
    }

    setIsProfileSettingsOpen(false)
    setProfileSaveError('')
  }

  function clearSelectedUpload() {
    if (uploadHistoryDisposeRef.current) {
      const dispose = uploadHistoryDisposeRef.current
      uploadHistoryDisposeRef.current = null
      dispose()
      return
    }

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

  async function openComments(post) {
    setCommentSheetPost(post)
    setCommentsError('')
  
    if (commentsByPhotoId[post.id]) {
      return
    }
  
    try {
      setIsLoadingComments(true)
      const comments = await onLoadPhotoComments?.(post.id)
      setCommentsByPhotoId((current) => ({
        ...current,
        [post.id]: comments || [],
      }))
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : 'Failed to load comments.',
      )
    } finally {
      setIsLoadingComments(false)
    }
  }

  async function openLikesSheet(post) {
    if (!post?.id) {
      return
    }

    setLikesSheetPost(post)
    setLikesError('')

    if (likesByPhotoId[post.id]) {
      return
    }

    try {
      setIsLoadingLikes(true)
      const likes = await onLoadPhotoLikes?.(post.id)
      setLikesByPhotoId((current) => ({
        ...current,
        [post.id]: likes || [],
      }))
    } catch (error) {
      setLikesError(error instanceof Error ? error.message : 'Failed to load likes.')
    } finally {
      setIsLoadingLikes(false)
    }
  }
  
  async function handleSubmitComment(body) {
    if (!commentSheetPost) {
      return
    }
  
    try {
      setIsSubmittingComment(true)
      setCommentsError('')
      const comment = await onAddPhotoComment?.(commentSheetPost.id, body)
  
      setCommentsByPhotoId((current) => ({
        ...current,
        [commentSheetPost.id]: [...(current[commentSheetPost.id] || []), comment],
      }))
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : 'Failed to add comment.',
      )
    } finally {
      setIsSubmittingComment(false)
    }
  }
  
  async function handleEditComment(commentId, body) {
    if (!commentSheetPost) {
      return
    }
  
    try {
      setIsSubmittingComment(true)
      setCommentsError('')
      const updatedComment = await onUpdatePhotoComment?.(
        commentSheetPost.id,
        commentId,
        body,
      )
  
      setCommentsByPhotoId((current) => ({
        ...current,
        [commentSheetPost.id]: (current[commentSheetPost.id] || []).map((comment) =>
          comment.id === updatedComment.id ? updatedComment : comment,
        ),
      }))
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : 'Failed to update comment.',
      )
    } finally {
      setIsSubmittingComment(false)
    }
  }
  
  async function handleDeleteComment(comment) {
    if (!commentSheetPost) {
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this comment?',
    )

    if (!confirmed) {
      return
    }
  
    try {
      setIsSubmittingComment(true)
      setCommentsError('')
      await onDeletePhotoComment?.(commentSheetPost.id, comment.id)
  
      setCommentsByPhotoId((current) => ({
        ...current,
        [commentSheetPost.id]: (current[commentSheetPost.id] || []).filter(
          (currentComment) => currentComment.id !== comment.id,
        ),
      }))
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : 'Failed to delete comment.',
      )
    } finally {
      setIsSubmittingComment(false)
    }
  }
  
  async function handleDeletePost(post) {
    if (!post?.id || deletingPostIds[post.id]) {
      return
    }
  
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this post?',
    )
  
    if (!confirmed) {
      return
    }
  
    try {
      setDeletingPostIds((current) => ({
        ...current,
        [post.id]: true,
      }))
      await onDeletePhoto?.(post.id)
  
      if (selectedPhoto?.id === post.id) {
        setSelectedPhoto(null)
      }
  
      if (selectedProfile?.id === post.id) {
        setSelectedProfile(null)
      }
  
      if (commentSheetPost?.id === post.id) {
        setCommentSheetPost(null)
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      window.alert(error instanceof Error ? error.message : 'Failed to delete post.')
    } finally {
      setDeletingPostIds((current) => {
        const next = { ...current }
        delete next[post.id]
        return next
      })
    }
  }

  async function handleToggleCommentLike(commentId, shouldLike) {
    if (!commentSheetPost) {
      return null
    }
  
    const result = await onTogglePhotoCommentLike?.(
      commentSheetPost.id,
      commentId,
      shouldLike,
    )
  
    if (!result) {
      return null
    }
  
    setCommentsByPhotoId((current) => ({
      ...current,
      [commentSheetPost.id]: (current[commentSheetPost.id] || []).map((comment) =>
        comment.id === result.id
          ? {
              ...comment,
              likesCount: result.likesCount,
              likedByCurrentVisitor: result.likedByCurrentVisitor,
              likerNames: result.likerNames,
              likesSummary:
                result.likesSummary ||
                `${result.likesCount} ${result.likesCount === 1 ? 'like' : 'likes'}`,
            }
          : comment,
      ),
    }))
  
    return result
  }

  async function handleToggleCommentLike(commentId, shouldLike) {
    if (!commentSheetPost) {
      return null
    }
  
    const result = await onTogglePhotoCommentLike?.(
      commentSheetPost.id,
      commentId,
      shouldLike,
    )
  
    if (!result) {
      return null
    }
  
    setCommentsByPhotoId((current) => ({
      ...current,
      [commentSheetPost.id]: (current[commentSheetPost.id] || []).map((comment) =>
        comment.id === result.id
          ? {
              ...comment,
              likesCount: result.likesCount,
              likedByCurrentVisitor: result.likedByCurrentVisitor,
              likerNames: result.likerNames,
              likesSummary:
                result.likesSummary ||
                `${result.likesCount} ${result.likesCount === 1 ? 'like' : 'likes'}`,
            }
          : comment,
      ),
    }))
  
    return result
  }

  async function openCommentLikesSheet(comment) {
    if (!commentSheetPost?.id || !comment?.id || Number(comment.likesCount) <= 0) {
      return
    }
  
    const sheetKey = `${commentSheetPost.id}:${comment.id}`
  
    setCommentLikesSheet({
      id: sheetKey,
      photoId: commentSheetPost.id,
      commentId: comment.id,
      likesCount: comment.likesCount,
    })
    setCommentLikesError('')
  
    if (commentLikesById[sheetKey]) {
      return
    }
  
    try {
      setIsLoadingCommentLikes(true)
      const likes = await onLoadPhotoCommentLikes?.(commentSheetPost.id, comment.id)
  
      setCommentLikesById((current) => ({
        ...current,
        [sheetKey]: likes || [],
      }))
    } catch (error) {
      setCommentLikesError(
        error instanceof Error ? error.message : 'Failed to load comment likes.',
      )
    } finally {
      setIsLoadingCommentLikes(false)
    }
  }
  
  useEffect(() => {
    if (!isLoadingMorePhotos) {
      isRequestingMoreRef.current = false
    }
  }, [isLoadingMorePhotos])

  useEffect(() => {
    if (selectedUploadFile && !uploadHistoryDisposeRef.current) {
      uploadHistoryDisposeRef.current = pushView('upload-modal', () => {
        uploadHistoryDisposeRef.current = null
        if (selectedUploadPreviewUrl) {
          URL.revokeObjectURL(selectedUploadPreviewUrl)
        }
        setSelectedUploadFile(null)
        setSelectedUploadCaption('')
        setSelectedUploadPreviewUrl('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      })
      return
    }

    if (!selectedUploadFile) {
      uploadHistoryDisposeRef.current = null
    }
  }, [pushView, selectedUploadFile, selectedUploadPreviewUrl])

  useEffect(() => {
    if (selectedProfile && !profileHistoryDisposeRef.current) {
      profileHistoryDisposeRef.current = pushView('profile-view', () => {
        profileHistoryDisposeRef.current = null
        setSelectedProfile(null)
      })
      return
    }

    if (!selectedProfile) {
      profileHistoryDisposeRef.current = null
    }
  }, [pushView, selectedProfile])

  useEffect(() => {
    if (selectedPhoto && !photoHistoryDisposeRef.current) {
      photoHistoryDisposeRef.current = pushView('photo-viewer', () => {
        photoHistoryDisposeRef.current = null
        setSelectedPhoto(null)
      })
      return
    }

    if (!selectedPhoto) {
      photoHistoryDisposeRef.current = null
    }
  }, [pushView, selectedPhoto])

  useEffect(() => {
    if (isProfileSettingsOpen && !profileSettingsHistoryDisposeRef.current) {
      profileSettingsHistoryDisposeRef.current = pushView('profile-settings', () => {
        profileSettingsHistoryDisposeRef.current = null
        setIsProfileSettingsOpen(false)
        setProfileSaveError('')
      })
      return
    }

    if (!isProfileSettingsOpen) {
      profileSettingsHistoryDisposeRef.current = null
    }
  }, [isProfileSettingsOpen, pushView])

  useEffect(() => {
    if (!selectedPhoto?.id) {
      return
    }
  
    const updatedPhoto = photos.find((photo) => photo.id === selectedPhoto.id)
  
    if (!updatedPhoto) {
      return
    }
  
    setSelectedPhoto((currentPhoto) =>
      currentPhoto
        ? {
            ...currentPhoto,
            ...updatedPhoto,
            src: updatedPhoto.image,
            alt: updatedPhoto.caption ?? 'Wedding photo',
          }
        : currentPhoto,
    )
  }, [photos, selectedPhoto?.id])
  
  useEffect(() => {
    if (commentSheetPost && !commentsHistoryDisposeRef.current) {
      commentsHistoryDisposeRef.current = pushView('comments-sheet', () => {
        commentsHistoryDisposeRef.current = null
        setCommentSheetPost(null)
      })
      return
    }
  
    if (!commentSheetPost) {
      commentsHistoryDisposeRef.current = null
    }
  }, [commentSheetPost, pushView])

  useEffect(() => {
    if (likesSheetPost && !likesHistoryDisposeRef.current) {
      likesHistoryDisposeRef.current = pushView('likes-sheet', () => {
        likesHistoryDisposeRef.current = null
        setLikesSheetPost(null)
        setLikesError('')
      })
      return
    }

    if (!likesSheetPost) {
      likesHistoryDisposeRef.current = null
    }
  }, [likesSheetPost, pushView])
  
  async function handleSaveProfile({ name, file }) {
    try {
      setIsSavingProfile(true)
      setProfileSaveError('')
      const nextProfile = await saveProfile({ name, file })
      onProfileUpdated?.(nextProfile)

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          String(member.authorId || '') === String(nextProfile.uuid || '')
            ? {
                ...member,
                author: nextProfile.name || member.author,
                profileImage: nextProfile.urlProfilePic || '',
                verified: Boolean(nextProfile.verified ?? member.verified),
              }
            : member,
        ),
      )

      setSelectedProfile((currentSelectedProfile) =>
        currentSelectedProfile &&
        String(currentSelectedProfile.authorId || '') === String(nextProfile.uuid || '')
          ? {
              ...currentSelectedProfile,
              author: nextProfile.name,
              profileImage: nextProfile.urlProfilePic || '',
              verified: Boolean(nextProfile.verified ?? currentSelectedProfile.verified),
            }
          : currentSelectedProfile,
      )

      closeProfileSettings()
    } catch (error) {
      setProfileSaveError(
        error instanceof Error ? error.message : 'Failed to save profile.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }
  

    function openCurrentUserProfile() {
        setIsNavOpen(false)

        setSelectedProfile({
            authorId: currentProfile?.uuid || currentProfile?.id,
            author: currentProfile?.name || 'Guest',
            profileImage:
            currentProfile?.urlProfilePic ||
            currentProfile?.profileImage ||
            currentProfile?.avatar ||
            '',
            verified: Boolean(currentProfile?.verified),
        })
    }

    function openMembers() {
        setIsNavOpen(false)
        setIsMembersOpen(true)
    }

    function closeMembers() {
    setIsMembersOpen(false) 
    }

    function openMemberProfile(member) {
        setIsMembersOpen(false)
        setSelectedProfile(member)
    }
  
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
          <button
            type="button"
            onClick={onGoHome}
            className="title-cursive m-0 text-2xl font-semibold text-zinc-950 transition active:scale-[0.98] sm:text-[1.35rem]"
          >
            Happy Memories 🌺
          </button>

            {hasVerifiedAccess ? (
            <div className="relative">
                <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 shadow-sm transition hover:bg-zinc-200 active:scale-95"
                onClick={() => setIsNavOpen((current) => !current)}
                aria-label="Open navigation menu"
                aria-expanded={isNavOpen}
                >
                <MenuIcon className="h-5 w-5" />
                </button>

                {isNavOpen ? (
                <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                    <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                    onClick={openCurrentUserProfile}
                    >
                      
                    <ProfileAvatar
                      src={currentProfile?.urlProfilePic || currentProfile?.profileImage || ''}
                      name={currentProfile?.name || 'Guest'}
                      className="h-12 w-12 shadow-none ring-0"
                    />
                    My account
                    </button>

                    <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                    onClick={openMembers}
                    >
                    <MembersIcon className="h-5 w-5" />
                    See members
                    </button>

                    <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    onClick={() => {
                        setIsNavOpen(false)
                        onLogout?.()
                    }}
                    >
                    <LogoutIcon className="h-5 w-5" />
                    Logout
                    </button>
                </div>
                ) : null}
            </div>
            ) : (
            <button
                type="button"
                className="rounded-full bg-zinc-950 px-5 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => requestPhotoAccess?.()}
                disabled={isVerifyingAccessCode}
            >
                {isVerifyingAccessCode ? 'Checking...' : 'Login'}
            </button>
            )}

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
          
          {isInitialLoadingPhotos ? (
            <>
              <FeedSkeletonCard />
              <FeedSkeletonCard />
              <FeedSkeletonCard />
            </>
          ) : null}

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
              {isRefreshing
                ? 'Refreshing memories...'
                : pullDistance >= PULL_TO_REFRESH_THRESHOLD
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </div>
          ) : null}

          {pendingNewPhotoCount > 0 ? (
            <button
              type="button"
              className="mx-auto flex w-full max-w-[520px] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-100"
              onClick={onLoadNewPhotos}
            >
              {pendingNewPhotoCount} new {pendingNewPhotoCount === 1 ? 'memory' : 'memories'}
            </button>
          ) : null}

        {canUploadPhotos ? (
            <div className="mx-auto flex w-full max-w-[520px] items-center justify-center gap-3">
                <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={handleOpenUploadPicker}
                disabled={isUploading || !canUploadPhotos}
                aria-label="Upload a photo"
                >
                <span className="text-lg leading-none">+</span>
                <span>Upload a photo</span>
                </button>

                <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={handleOpenCamera}
                disabled={!canUploadPhotos}
                aria-label="Take a photo"
                >
                <MinimalCameraIcon className="h-5 w-5" />
                <span>Take a photo</span>
                </button>
            </div>
        ) : null}

          {posts.map((post) => {
            const isDummyPost = post.id?.startsWith?.('dummy-')
            const isPersistedPhoto = !isDummyPost && Boolean(post.id)
            const optimisticLike = optimisticLikes[post.id]
            const baseIsLiked = Boolean(post.likedByCurrentVisitor ?? likedPosts[post.id])
            const baseLikeCount = Number(post.likesCount) || 0
            const isLiked = optimisticLike?.isLiked ?? baseIsLiked
            const likeCount = optimisticLike?.likesCount ?? baseLikeCount
            const showLikeCount = likeCount > 0
            const postTime = formatRelativeTime(post.createdAt)

            return (
                <article
                  key={post.id}
                  className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
                >
                  <div className="relative">
                    <button
                      type="button"
                      className="block w-full cursor-zoom-in bg-stone-100"
                      onClick={() =>
                        setSelectedPhoto({
                          ...post,
                          src: post.image,
                          alt: post.caption ?? 'Wedding photo',
                        })
                      }
                      aria-label="Open photo viewer"
                    >
                      <img
                        src={post.image}
                        alt={post.caption}
                        className="block aspect-[4/5] w-full bg-stone-100 object-cover"
                        loading="lazy"
                      />
                    </button>

                  </div>

                  <div className="px-[18px] pt-4 pb-[18px]">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openProfile(post)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <ProfileAvatar
                          src={
                            post.profileImage ||
                            post.profilePhoto ||
                            post.avatar ||
                            post.authorAvatar
                          }
                          name={post.author}
                        />
                        <div className="min-w-0">
                         <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-zinc-950">
                           <span className="truncate">{post.author}</span>
                           {post.verified ? <VerifiedBadge /> : null}
                         </span>
                         {postTime ? (
                           <span className="mt-0.5 block text-xs font-medium text-zinc-500">
                             {postTime}
                           </span>
                         ) : null}
                        </div>
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 bg-transparent px-1 py-1 text-sm font-medium text-zinc-950 transition hover:opacity-80"
                          onClick={() => openComments(post)}
                          aria-label="Open comments"
                          >
                          <CommentIcon />
                          {Number(post.commentsCount) > 0 ? <span>{post.commentsCount}</span> : null}
                        </button>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 bg-transparent px-1 py-1 text-sm font-medium transition ${
                            canLikePhotos && !likingPostIds[post.id]
                              ? 'text-zinc-950 hover:opacity-80'
                              : 'cursor-not-allowed opacity-40 text-zinc-950'
                          }`}
                          onClick={() =>
                            canLikePhotos &&
                            !likingPostIds[post.id] &&
                            handleLike(post.id, isPersistedPhoto, isLiked, likeCount)
                          }
                          disabled={!canLikePhotos || Boolean(likingPostIds[post.id])}
                          aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                        >
                          <HeartIcon isLiked={isLiked} />
                          {showLikeCount ? <span>{likeCount}</span> : null}
                        </button>
                      </div>
                    </div>

                    <p className="mt-3.5 text-left text-base leading-7 text-zinc-700">
                      {post.caption}
                    </p>
                  </div>
                </article>
              )
            })}

          {isLoadingMorePhotos ? (
            <>
              <FeedSkeletonCard />
              <FeedSkeletonCard />
            </>
          ) : null}

          <footer className="mx-auto mt-8 mb-6 max-w-[520px] px-6 text-center">
            <p className="text-sm text-zinc-500 italic">
              Developed by Baldwin
            </p>
          </footer>
        </div>
      </div>

          {showAccessTip ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/25 px-5 backdrop-blur-md">
              <div className="w-full max-w-[320px] rounded-[28px] border border-white/70 bg-white/85 p-5 text-center text-sm shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <p className="mb-4 font-medium text-zinc-800">
                  Enter the pass code to continue.
                </p>
                
                <input
                  type="password"
                  value={accessCodeInput}
                  onChange={(event) => onAccessCodeInputChange?.(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      onAccessClick?.()
                    }
                  }}
                  className="mb-4 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-center text-base font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                  placeholder="Pass code"
                  autoComplete="current-password"
                  autoFocus
                />

                <div
                  className={`mb-3 min-h-[20px] text-xs font-medium text-red-600 transition-opacity duration-500 ${
                    accessCodeErrorVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-live="polite"
                >
                  {accessCodeError || ' '}
                </div>

                <div className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 active:bg-zinc-200"
                    onClick={onCloseAccessTip}
                    disabled={isVerifyingAccessCode}
                  >
                    Cancel
                  </button>
          
                  <div className="w-px bg-zinc-200" />
          
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 active:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={onAccessClick}
                    disabled={isVerifyingAccessCode}
                  >
                    {isVerifyingAccessCode ? 'Checking...' : 'ACCESS'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
      
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

      {isMembersOpen ? (
        <MembersView
            members={members}
            onBack={closeMembers}
            onSelectMember={openMemberProfile}
        />
        ) : null}

      {selectedProfile ? (
        <ProfileView
          profile={selectedProfile}
          posts={photos}
          onBack={closeSelectedProfile}
          onSelectPhoto={setSelectedPhoto}
        />
      ) : null}
      
      <CommentsSheet
        post={commentSheetPost}
        comments={commentSheetPost ? commentsByPhotoId[commentSheetPost.id] || [] : []}
        isLoading={isLoadingComments}
        isSubmitting={isSubmittingComment}
        error={commentsError}
        canComment={canLikePhotos}
        currentProfile={currentProfile}
        onOpenLikes={openLikesSheet}
        onClose={closeCommentsSheet}
        onSubmit={handleSubmitComment}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment}
        onToggleCommentLike={handleToggleCommentLike}
        onOpenCommentLikes={openCommentLikesSheet}
      />

      <LikesSheet
        post={likesSheetPost}
        likes={likesSheetPost ? likesByPhotoId[likesSheetPost.id] || [] : []}
        isLoading={isLoadingLikes}
        error={likesError}
        onClose={closeLikesSheet}
        onSelectProfile={openProfileFromLikes}
      />
      
      <ProfileSettings
        isOpen={isProfileSettingsOpen}
        profile={currentProfile}
        isSaving={isSavingProfile}
        error={profileSaveError}
        canEditProfile={canEditProfile}
        onClose={closeProfileSettings}
        onSave={handleSaveProfile}
        onLogout={onLogout}
      />

      <PhotoViewer
        photo={selectedPhoto}
        canLikePhotos={canLikePhotos}
        onClose={closeSelectedPhoto}
        onCommentClick={openComments}
        onLikeClick={(photo) => {
          const optimisticLike = optimisticLikes[photo.id]
          const baseIsLiked = Boolean(photo.likedByCurrentVisitor)
          const baseLikeCount = Number(photo.likesCount) || 0
          const isLiked = optimisticLike?.isLiked ?? baseIsLiked
          const likeCount = optimisticLike?.likesCount ?? baseLikeCount
      
          if (!likingPostIds[photo.id]) {
            handleLike(photo.id, true, isLiked, likeCount)
          }
        }}
        canDeletePhoto={Boolean(onDeletePhoto)}
        isDeletingPhoto={Boolean(deletingPostIds[selectedPhoto?.id])}
        onDeleteClick={handleDeletePost}
      />
    </section>
  )
}

export default NewsFeed
