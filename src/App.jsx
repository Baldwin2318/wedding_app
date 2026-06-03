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
  const [pendingNewPhotoIds, setPendingNewPhotoIds] = useState([])

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

    fetchSavedPhotos()
      .then((savedPhotos) => {
        if (isCancelled) {
          return
        }

        setFeedPhotos(savedPhotos.map(mapSavedPhotoToFeedPhoto))
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('Failed to load saved photos:', error)
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
    const savedPhotos = await fetchSavedPhotos()

    setFeedPhotos(savedPhotos.map(mapSavedPhotoToFeedPhoto))
    setPendingNewPhotoIds([])
  }

  const screens = {
    introduction: <Introduction onNext={() => setCurrentScreen('guide')} />,
    guide: (
      <Guide
        onNext={openCameraScreen}
        onViewFeed={() => setCurrentScreen('feed')}
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
        photos={feedPhotos}
        onAddPhoto={openCameraScreen}
        onLoadNewPhotos={handleLoadNewPhotos}
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
