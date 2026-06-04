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

let hasTrackedAppOpen = false
const PHOTO_PAGE_SIZE = 12
const PHOTO_ACCESS_STORAGE_KEY = 'wedding_photo_access_code'

function mapSavedPhotoToFeedPhoto(photo) {
  return {
    id: String(photo.id || photo.key),
    image: photo.imageUrl,
    caption: photo.caption || 'Wedding memory',
    likesCount: photo.likesCount ?? null,
    likedByCurrentVisitor: Boolean(photo.likedByCurrentVisitor),
    author: 'Guest',
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
  const [pendingRestrictedAction, setPendingRestrictedAction] = useState(null)

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

    fetchSavedPhotos({ limit: PHOTO_PAGE_SIZE, offset: 0 })
      .then((savedPhotosPayload) => {
        if (isCancelled) {
          return
        }

        setFeedPhotos(savedPhotosPayload.photos.map(mapSavedPhotoToFeedPhoto))
        setHasMoreFeedPhotos(savedPhotosPayload.hasMore)
        setNextFeedOffset(savedPhotosPayload.nextOffset || savedPhotosPayload.photos.length)
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('Failed to load saved photos:', error)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsInitialFeedLoading(false)
        }
      })

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
    const savedCode = window.localStorage.getItem(PHOTO_ACCESS_STORAGE_KEY)
    setIsPhotoRestricted(!savedCode)
  }, [])
  
  function openCameraScreen() {
    setCameraSessionKey((currentKey) => currentKey + 1)
    setCurrentScreen('camera')
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
          author: 'You',
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
        author: 'You',
      },
      ...currentPhotos,
    ])
    setNextFeedOffset((currentOffset) => currentOffset + 1)

    setCurrentScreen('feed')
  }

  async function handleTogglePhotoLike(photoId, shouldLike) {
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
    try {
      setIsInitialFeedLoading(true)
      const savedPhotosPayload = await fetchSavedPhotos({
        limit: PHOTO_PAGE_SIZE,
        offset: 0,
      })

      setFeedPhotos(savedPhotosPayload.photos.map(mapSavedPhotoToFeedPhoto))
      setHasMoreFeedPhotos(savedPhotosPayload.hasMore)
      setNextFeedOffset(savedPhotosPayload.nextOffset || savedPhotosPayload.photos.length)
      setPendingNewPhotoIds([])
    } finally {
      setIsInitialFeedLoading(false)
    }
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
    const code = window.prompt('Enter the access code')
  
    if (!code?.trim()) {
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
        body: JSON.stringify({ code: code.trim() }),
      })
  
      const payload = await response.json()
  
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to verify access code.')
      }
  
      if (!payload.valid) {
        setAccessCodeError('Invalid access code.')
        return
      }
  
      window.localStorage.setItem(PHOTO_ACCESS_STORAGE_KEY, code.trim())
      setIsPhotoRestricted(false)
      setShowAccessTip(false)
  
      pendingRestrictedAction?.()
      setPendingRestrictedAction(null)
    } catch (error) {
      console.error('Failed to verify access code:', error)
      setAccessCodeError(
        error instanceof Error ? error.message : 'Failed to verify access code.',
      )
    } finally {
      setIsVerifyingAccessCode(false)
    }
  }
  
  const screens = {
    introduction: <Introduction onNext={() => setCurrentScreen('guide')} />,
    guide: (
      <Guide  
        onNext={() => requestPhotoAccess(openCameraScreen)}
        onViewFeed={() => setCurrentScreen('feed')}
        showAccessTip={showAccessTip}
        accessCodeError={accessCodeError}
        isVerifyingAccessCode={isVerifyingAccessCode}
        onAccessClick={handleAccessClick}
        onCloseAccessTip={() => setShowAccessTip(false)}
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
        onAddPhoto={openCameraScreen}
        onLoadNewPhotos={handleLoadNewPhotos}
        onLoadMorePhotos={handleLoadMorePhotos}
        onRefreshPhotos={handleLoadNewPhotos}
        onTogglePhotoLike={handleTogglePhotoLike}
        pendingNewPhotoCount={pendingNewPhotoIds.length}
        onUploadPhoto={handleSelectedPhotoUpload}
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
