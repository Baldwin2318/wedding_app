import { useEffect, useState } from 'react'
import Introduction from './components/Introduction'
import Guide from './components/Guide'
import Camera from './components/Camera'
import NewsFeed from './components/NewsFeed'
import { trackAppOpen } from './lib/trackAppOpen'
import { uploadCapturedPhoto } from './lib/uploadPhoto'

let hasTrackedAppOpen = false

function App() {
  const [currentScreen, setCurrentScreen] = useState('introduction')
  const [cameraSessionKey, setCameraSessionKey] = useState(0)
  const [feedPhotos, setFeedPhotos] = useState([])

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
          id: uploadedPhoto.key || `capture-${Date.now()}`,
          image: uploadedPhoto.imageUrl,
          caption: uploadedPhoto.caption || photo.caption || 'New wedding memory',
          likes: 0,
          author: 'You',
        },
        ...currentPhotos,
      ])
    }

    setCurrentScreen('feed')
  }

  const screens = {
    introduction: <Introduction onNext={() => setCurrentScreen('guide')} />,
    guide: <Guide onNext={openCameraScreen} />,
    camera: (
      <Camera
        key={cameraSessionKey}
        isActive={currentScreen === 'camera'}
        onDone={handleCameraDone}
      />
    ),
    feed: <NewsFeed photos={feedPhotos} onAddPhoto={openCameraScreen} />,
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-950">
      <div className="min-h-screen">{screens[currentScreen]}</div>
    </div>
  )
}

export default App
