import { useEffect, useState } from 'react'
import Introduction from './components/Introduction'
import Guide from './components/Guide'
import Camera from './components/Camera'
import NewsFeed from './components/NewsFeed'
import { fetchSavedPhotos } from './lib/fetchPhotos'
import { subscribeToPhotoUpdates } from './lib/subscribeToPhotoUpdates'
import { trackAppOpen } from './lib/trackAppOpen'
import { togglePhotoLike } from './lib/togglePhotoLike'
import { uploadCapturedPhoto, uploadSelectedPhoto } from './lib/uploadPhoto'
import HeartMark from './components/HeartMark'
import {
  PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY,
  PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY,
  PHOTO_ACCESS_UUID_STORAGE_KEY,
} from './lib/accessCode'

let hasTrackedAppOpen = false
const PHOTO_PAGE_SIZE = 12
const LEGACY_PHOTO_ACCESS_STORAGE_KEY = 'wedding_photo_access_code'
const LEGACY_PHOTO_ACCESS_CODE_ID_STORAGE_KEY = 'wedding_photo_access_code_id'
const ANONYMOUS_ACCESS_UUID = '4a2e7030-e779-4572-9868-5cb073d6a58d'

function isAnonymousProfile(profile) {
  return String(profile?.uuid || '').trim() === ANONYMOUS_ACCESS_UUID
}

function mapSavedPhotoToFeedPhoto(photo) {
  return {
    id: String(photo.id || photo.key),
    image: photo.imageUrl,
    caption: photo.caption || 'Wedding memory',
    likesCount: photo.likesCount ?? null,
    likedByCurrentVisitor: Boolean(photo.likedByCurrentVisitor),
    author: photo.uploaderName || 'Guest',
    authorId: photo.uploaderUuid || '',
    profileImage: photo.profileImageUrl || '',
  }
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('introduction')
  const [cameraSessionKey, setCameraSessionKey] = useState(0)
  const [feedPhotos, setFeedPhotos] = useState([])
  const [hasMoreFeedPhotos, setHasMoreFeedPhotos] = useState(true)
  const [isInitialFeedLoading, setIsInitialFeedLoading] = useState(true)
  const [isLoadingMoreFeedPhotos, setIsLoadingMoreFeedPhotos] = useState(false)
  const [nextFeedOffset, setNextFeedOffset] = useState(0)
  const [pendingNewPhotoIds, setPendingNewPhotoIds] = useState([])
  const [isPhotoRestricted, setIsPhotoRestricted] = useState(true)
  const [showAccessTip, setShowAccessTip] = useState(false)
  const [isVerifyingAccessCode, setIsVerifyingAccessCode] = useState(false)
  const [accessCodeError, setAccessCodeError] = useState('')
  const [isAccessCodeErrorVisible, setIsAccessCodeErrorVisible] = useState(false)
  const [pendingRestrictedAction, setPendingRestrictedAction] = useState(null)
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [accessCodeInput, setAccessCodeInput] = useState('')
  const [currentProfile, setCurrentProfile] = useState(() => ({
    uuid: typeof window !== 'undefined'
      ? window.localStorage.getItem(PHOTO_ACCESS_UUID_STORAGE_KEY) || ''
      : '',
    name: typeof window !== 'undefined'
      ? window.localStorage.getItem(PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY) || 'Guest'
      : 'Guest',
    urlProfilePic: typeof window !== 'undefined'
      ? window.localStorage.getItem(PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY) || ''
      : '',
  }))
  const canUsePersonalFeatures = !isPhotoRestricted && Boolean(currentProfile.uuid) && !isAnonymousProfile(currentProfile)

  async function refreshFeedPhotos({ showSkeleton = true } = {}) {
    try {
      if (showSkeleton) {
        setIsInitialFeedLoading(true)
      }

      const savedPhotosPayload = await fetchSavedPhotos({
        limit: PHOTO_PAGE_SIZE,
        offset: 0,
      })

      setFeedPhotos(savedPhotosPayload.photos.map(mapSavedPhotoToFeedPhoto))
      setHasMoreFeedPhotos(savedPhotosPayload.hasMore)
      setNextFeedOffset(savedPhotosPayload.nextOffset || savedPhotosPayload.photos.length)
      setPendingNewPhotoIds([])
    } finally {
      if (showSkeleton) {
        setIsInitialFeedLoading(false)
      }
    }
  }

  useEffect(() => {
    function updateViewportMetrics() {
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const keyboardInset = Math.max(window.innerHeight - viewportHeight, 0)

      document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`)
      document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`)
    }

    updateViewportMetrics()

    window.visualViewport?.addEventListener('resize', updateViewportMetrics)
    window.addEventListener('resize', updateViewportMetrics)

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportMetrics)
      window.removeEventListener('resize', updateViewportMetrics)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [currentScreen])

  useEffect(() => {
    if (!accessCodeError) {
      setIsAccessCodeErrorVisible(false)
      return undefined
    }

    setIsAccessCodeErrorVisible(true)

    const fadeTimer = window.setTimeout(() => {
      setIsAccessCodeErrorVisible(false)
    }, 2000)

    const clearTimer = window.setTimeout(() => {
      setAccessCodeError('')
    }, 2600)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(clearTimer)
    }
  }, [accessCodeError])

  useEffect(() => {
    if (hasTrackedAppOpen) {
      return
    }

    hasTrackedAppOpen = true

    trackAppOpen().catch((error) => {
      console.error('Failed to track app open:', error)
    })
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function loadInitialFeed() {
      try {
        const savedPhotosPayload = await fetchSavedPhotos({ limit: PHOTO_PAGE_SIZE, offset: 0 })

        if (isCancelled) {
          return
        }

        setFeedPhotos(savedPhotosPayload.photos.map(mapSavedPhotoToFeedPhoto))
        setHasMoreFeedPhotos(savedPhotosPayload.hasMore)
        setNextFeedOffset(savedPhotosPayload.nextOffset || savedPhotosPayload.photos.length)
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load saved photos:', error)
        }
      } finally {
        if (!isCancelled) {
          setIsInitialFeedLoading(false)
        }
      }
    }

    loadInitialFeed()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (currentScreen !== 'feed') {
      return undefined
    }

    return subscribeToPhotoUpdates({
      onPhotoCreated: (createdPhoto) => {
        if (createdPhoto.createdByCurrentVisitor) {
          return
        }

        setFeedPhotos((currentPhotos) => {
          if (currentPhotos.some((photo) => photo.id === String(createdPhoto.id))) {
            return currentPhotos
          }

          setPendingNewPhotoIds((currentIds) => {
            if (currentIds.includes(String(createdPhoto.id))) {
              return currentIds
            }

            return [...currentIds, String(createdPhoto.id)]
          })

          return currentPhotos
        })
      },
      onPhotoLikeUpdated: (updatedPhoto) => {
        setFeedPhotos((currentPhotos) =>
          currentPhotos.map((photo) =>
            photo.id === String(updatedPhoto.id)
              ? {
                  ...photo,
                  likesCount: updatedPhoto.likesCount ?? null,
                  likedByCurrentVisitor:
                    typeof updatedPhoto.likedByCurrentVisitor === 'boolean'
                      ? updatedPhoto.likedByCurrentVisitor
                      : photo.likedByCurrentVisitor,
                }
              : photo,
          ),
        )
      },
      onError: (error) => {
        console.error('Photo updates stream error:', error)
      },
    })
  }, [currentScreen])

  useEffect(() => {
    let isCancelled = false

    window.localStorage.removeItem(LEGACY_PHOTO_ACCESS_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_PHOTO_ACCESS_CODE_ID_STORAGE_KEY)
  
    async function verifySavedAccessCodeSession() {
      const savedAccessCodeUuid = window.localStorage.getItem(PHOTO_ACCESS_UUID_STORAGE_KEY)
        
      if (!savedAccessCodeUuid?.trim()) {
        setIsPhotoRestricted(true)
        setIsRestoringSession(false)
        return
      }
      
      try {
        const response = await fetch('/api/access-codes/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessCodeUuid: savedAccessCodeUuid.trim() }),
        })
  
        const payload = await response.json()
  
        if (isCancelled) {
          return
        }
  
        if (!response.ok || !payload.ok || !payload.valid) {
          window.localStorage.removeItem(PHOTO_ACCESS_UUID_STORAGE_KEY)
          window.localStorage.removeItem(PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY)
          window.localStorage.removeItem(PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY)
          setCurrentProfile({ uuid: '', name: 'Guest', urlProfilePic: '' })
          setIsPhotoRestricted(true)
          setIsRestoringSession(false)
          return
        }

        window.localStorage.setItem(
          PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY,
          payload.guestName || 'Guest',
        )
        window.localStorage.setItem(
          PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY,
          payload.profile?.urlProfilePic || '',
        )
        const restoredProfile = {
          uuid: savedAccessCodeUuid.trim(),
          name: payload.profile?.name || payload.guestName || 'Guest',
          urlProfilePic: payload.profile?.urlProfilePic || '',
        }
        
        setCurrentProfile(restoredProfile)
        setIsPhotoRestricted(false)
        
        if (!isAnonymousProfile(restoredProfile)) {
          setCurrentScreen('feed')
        }
        
        setIsRestoringSession(false)
        refreshFeedPhotos({ showSkeleton: false }).catch((error) => {
          console.error('Failed to refresh feed after restored login:', error)
        })
      } catch (error) {
        console.error('Failed to verify saved access code session:', error)
      
        if (!isCancelled) {
          setIsPhotoRestricted(true)
          setIsRestoringSession(false)
        }
      }
    }
  
    verifySavedAccessCodeSession()
  
    return () => {
      isCancelled = true
    }
  }, [])
  
  function openCameraScreen() {
    setCameraSessionKey((currentKey) => currentKey + 1)
    setCurrentScreen('camera')
  }

  function requestUploadAccess(action) {
    if (isPhotoRestricted) {
      setPendingRestrictedAction(() => action)
      setAccessCodeError('')
      setShowAccessTip(true)
      return
    }

    if (!canUsePersonalFeatures) {
      setPendingRestrictedAction(null)
      setAccessCodeError(
        isAnonymousProfile(currentProfile)
          ? 'Anonymous access can view memories but cannot upload photos.'
          : '',
      )
      setShowAccessTip(true)
      return
    }

    action()
  }

  async function handleCameraDone(photo) {
    if (photo?.image) {
      const uploadedPhoto = await uploadCapturedPhoto({
        imageDataUrl: photo.image,
        caption: photo.caption,
      })

      setFeedPhotos((currentPhotos) => [
        {
          id: String(uploadedPhoto.id || uploadedPhoto.key || `capture-${Date.now()}`),
          image: uploadedPhoto.imageUrl,
          caption: uploadedPhoto.caption || photo.caption || 'New wedding memory',
          likesCount: uploadedPhoto.likesCount ?? null,
          likedByCurrentVisitor: false,
          author: uploadedPhoto.uploaderName || 'Guest',
          authorId: uploadedPhoto.uploaderUuid || currentProfile.uuid || '',
          profileImage: uploadedPhoto.profileImageUrl || '',
        },
        ...currentPhotos,
      ])
      setNextFeedOffset((currentOffset) => currentOffset + 1)
    }

    setCurrentScreen('feed')
  }

  async function handleSelectedPhotoUpload(file, caption = '') {
    const uploadedPhoto = await uploadSelectedPhoto({
      file,
      caption,
    })

    setFeedPhotos((currentPhotos) => [
      {
        id: String(uploadedPhoto.id || uploadedPhoto.key || `upload-${Date.now()}`),
        image: uploadedPhoto.imageUrl,
        caption: uploadedPhoto.caption || 'New wedding memory',
        likesCount: uploadedPhoto.likesCount ?? null,
        likedByCurrentVisitor: false,
        author: uploadedPhoto.uploaderName || 'Guest',
        authorId: uploadedPhoto.uploaderUuid || currentProfile.uuid || '',
        profileImage: uploadedPhoto.profileImageUrl || '',
      },
      ...currentPhotos,
    ])
    setNextFeedOffset((currentOffset) => currentOffset + 1)

    setCurrentScreen('feed')
  }

  async function handleTogglePhotoLike(photoId, shouldLike) {
    if (isPhotoRestricted) {
      return
    }

    const likedPhoto = await togglePhotoLike(photoId, shouldLike)

    setFeedPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === likedPhoto.id
          ? {
              ...photo,
              likesCount: likedPhoto.likesCount,
              likedByCurrentVisitor: likedPhoto.likedByCurrentVisitor,
            }
          : photo,
      ),
    )
  }

  async function handleLoadNewPhotos() {
    await refreshFeedPhotos({ showSkeleton: true })
  }

  async function handleLoadMorePhotos() {
    if (isInitialFeedLoading || isLoadingMoreFeedPhotos || !hasMoreFeedPhotos) {
      return
    }

    try {
      setIsLoadingMoreFeedPhotos(true)
      const savedPhotosPayload = await fetchSavedPhotos({
        limit: PHOTO_PAGE_SIZE,
        offset: nextFeedOffset,
      })

      setFeedPhotos((currentPhotos) => [
        ...currentPhotos,
        ...savedPhotosPayload.photos.map(mapSavedPhotoToFeedPhoto),
      ])
      setHasMoreFeedPhotos(savedPhotosPayload.hasMore)
      setNextFeedOffset(
        savedPhotosPayload.nextOffset || nextFeedOffset + savedPhotosPayload.photos.length,
      )
    } catch (error) {
      console.error('Failed to load more photos:', error)
    } finally {
      setIsLoadingMoreFeedPhotos(false)
    }
  }

  function requestPhotoAccess(action) {
    if (isPhotoRestricted) {
      setPendingRestrictedAction(() => action)
      setShowAccessTip(true)
      return
    }
  
    action()
  }
  
  async function handleAccessClick() {
    const normalizedCode = accessCodeInput.trim().toLowerCase()
    
    if (!normalizedCode) {
      setAccessCodeError('Please enter the pass code.')
      setShowAccessTip(true)
      return
    }
  
    try {
      setIsVerifyingAccessCode(true)
      setAccessCodeError('')
  
      const response = await fetch('/api/access-codes/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: normalizedCode }),
      })
  
      const payload = await response.json()
  
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to verify access code.')
      }
  
      if (!payload.valid) {
        setAccessCodeError('Invalid access code.')
        setShowAccessTip(true)
        return
      }

      if (!payload.accessCodeUuid) {
        throw new Error('Access code verification succeeded without a UUID.')
      }
      
      const actionToRun = pendingRestrictedAction
      const nextProfile = {
        uuid: String(payload.accessCodeUuid),
        name: payload.profile?.name || payload.guestName || 'Guest',
        urlProfilePic: payload.profile?.urlProfilePic || '',
      }
      const isAnonymousLogin = isAnonymousProfile(nextProfile)
    
      window.localStorage.setItem(
        PHOTO_ACCESS_UUID_STORAGE_KEY,
        nextProfile.uuid,
      )
      window.localStorage.setItem(
        PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY,
        nextProfile.name,
      )
      window.localStorage.setItem(
        PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY,
        nextProfile.urlProfilePic,
      )
      setCurrentProfile(nextProfile)
      window.localStorage.removeItem(LEGACY_PHOTO_ACCESS_STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_PHOTO_ACCESS_CODE_ID_STORAGE_KEY)
      setIsPhotoRestricted(false)
      setShowAccessTip(false)
      setAccessCodeInput('')
      setPendingRestrictedAction(null)
      await refreshFeedPhotos({ showSkeleton: true })
      
      if (!isAnonymousLogin) {
        if (actionToRun) {
          actionToRun()
        } else {
          setCurrentScreen('feed')
        }
      }
    } catch (error) {
      console.error('Failed to verify access code:', error)
      setAccessCodeError(
        error instanceof Error ? error.message : 'Failed to verify access code.',
      )
      setShowAccessTip(true)
    } finally {
      setIsVerifyingAccessCode(false)
    }
  }

  async function handleLogout() {
    window.localStorage.removeItem(PHOTO_ACCESS_UUID_STORAGE_KEY)
    window.localStorage.removeItem(PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY)
    window.localStorage.removeItem(PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY)

    setCurrentProfile({
      uuid: '',
      name: 'Guest',
      urlProfilePic: '',
    })
    setIsPhotoRestricted(true)
    setShowAccessTip(false)
    setAccessCodeError('')
    setIsAccessCodeErrorVisible(false)
    setPendingRestrictedAction(null)
    setFeedPhotos((currentPhotos) =>
      currentPhotos.map((photo) => ({
        ...photo,
        likedByCurrentVisitor: false,
      })),
    )
    await refreshFeedPhotos({ showSkeleton: true })
    setCurrentScreen('introduction')
  }

  function handleProfileUpdated(profile) {
    const nextProfile = {
      uuid: profile?.uuid || currentProfile.uuid || '',
      name: profile?.name || currentProfile.name || 'Guest',
      urlProfilePic: profile?.urlProfilePic || '',
    }

    setCurrentProfile(nextProfile)
    window.localStorage.setItem(
      PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY,
      nextProfile.name || 'Guest',
    )
    window.localStorage.setItem(
      PHOTO_ACCESS_PROFILE_IMAGE_STORAGE_KEY,
      nextProfile.urlProfilePic || '',
    )

    setFeedPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.authorId === nextProfile.uuid
          ? {
              ...photo,
              author: nextProfile.name,
              profileImage: nextProfile.urlProfilePic,
            }
          : photo,
      ),
    )
  }

  if (isRestoringSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-50 px-6">
        <div className="flex w-full max-w-[320px] flex-col items-center rounded-[32px] border border-white/80 bg-white/85 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <HeartMark className="h-9 w-9 text-white" />
  
          <p className="mb-1 text-base font-semibold text-zinc-950">
            Happy Memories
          </p>
  
          <p className="mb-6 text-sm text-zinc-500">
            Preparing your wedding feed...
          </p>
  
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950" />
        </div>
      </div>
    )
  }
    
  const screens = {
    introduction: (
      <Introduction
        onNext={() => requestUploadAccess(() => setCurrentScreen('guide'))}
        onSkip={() => setCurrentScreen('feed')}
        showAccessTip={showAccessTip}
        accessCodeError={accessCodeError}
        accessCodeErrorVisible={isAccessCodeErrorVisible}
        isVerifyingAccessCode={isVerifyingAccessCode}
        onAccessClick={handleAccessClick}
        onCloseAccessTip={() => {
          setShowAccessTip(false)
          setAccessCodeInput('')
          setAccessCodeError('')
        }}
        accessCodeInput={accessCodeInput}
        onAccessCodeInputChange={setAccessCodeInput}  
      />
    ),
    guide: (
      <Guide  
        onNext={() => requestUploadAccess(openCameraScreen)}
        onViewFeed={() => setCurrentScreen('feed')}
        showAccessTip={showAccessTip}
        accessCodeError={accessCodeError}
        accessCodeErrorVisible={isAccessCodeErrorVisible}
        isVerifyingAccessCode={isVerifyingAccessCode}
        onAccessClick={handleAccessClick}
        onCloseAccessTip={() => {
          setShowAccessTip(false)
          setAccessCodeInput('')
          setAccessCodeError('')
        }}
        canUseCamera={isPhotoRestricted || canUsePersonalFeatures}
        accessCodeInput={accessCodeInput}
        onAccessCodeInputChange={setAccessCodeInput}
      />
    ),
    camera: (
      <Camera
        key={cameraSessionKey}
        isActive={currentScreen === 'camera'}
        onDone={handleCameraDone}
        onUploadPhoto={handleSelectedPhotoUpload}
        onViewFeed={() => setCurrentScreen('feed')}
      />
    ),
    feed: (
      <NewsFeed
        hasMorePhotos={hasMoreFeedPhotos}
        isInitialLoadingPhotos={isInitialFeedLoading}
        isLoadingMorePhotos={isLoadingMoreFeedPhotos}
        photos={feedPhotos}
        onAddPhoto={() => requestUploadAccess(openCameraScreen)}
        onLoadNewPhotos={handleLoadNewPhotos}
        onLoadMorePhotos={handleLoadMorePhotos}
        onRefreshPhotos={handleLoadNewPhotos}
        onTogglePhotoLike={handleTogglePhotoLike}
        pendingNewPhotoCount={pendingNewPhotoIds.length}
        onUploadPhoto={handleSelectedPhotoUpload}
        requestPhotoAccess={requestUploadAccess}
        showAccessTip={showAccessTip}
        accessCodeError={accessCodeError}
        accessCodeErrorVisible={isAccessCodeErrorVisible}
        isVerifyingAccessCode={isVerifyingAccessCode}
        onAccessClick={handleAccessClick}
        onCloseAccessTip={() => {
         setShowAccessTip(false)
         setAccessCodeInput('')
         setAccessCodeError('')
        }}
        onGoHome={() => setCurrentScreen('introduction')}
        currentProfile={currentProfile}
        hasVerifiedAccess={!isPhotoRestricted && Boolean(currentProfile.uuid)}
        canEditProfile={canUsePersonalFeatures}
        canLikePhotos={!isPhotoRestricted && Boolean(currentProfile.uuid)}
        canUploadPhotos={canUsePersonalFeatures}
        onProfileUpdated={handleProfileUpdated}
        onLogout={handleLogout}
        accessCodeInput={accessCodeInput}
        onAccessCodeInputChange={setAccessCodeInput}
      />
    ),
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-950">
      <div className="min-h-screen">{screens[currentScreen]}</div>
    </div>
  )
}

export default App
