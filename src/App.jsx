import { useState } from 'react'
import Introduction from './components/Introduction'
import Guide from './components/Guide'
import Camera from './components/Camera'
import NewsFeed from './components/NewsFeed'

function App() {
  const [currentScreen, setCurrentScreen] = useState('introduction')
  const [feedPhotos, setFeedPhotos] = useState([])
  const screenTrackClassName = {
    introduction: 'translate-x-0',
    guide: '-translate-x-1/4',
    camera: '-translate-x-2/4',
    feed: '-translate-x-3/4',
  }[currentScreen]

  function handleCameraDone(photo) {
    if (photo?.image) {
      setFeedPhotos((currentPhotos) => [
        {
          id: `capture-${Date.now()}`,
          image: photo.image,
          caption: photo.caption || 'New wedding memory',
          likes: 0,
          author: 'You',
        },
        ...currentPhotos,
      ])
    }

    setCurrentScreen('feed')
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="min-h-screen overflow-hidden">
        <div
          className={`flex min-h-screen w-[400%] transform transition-transform duration-500 ease-out ${screenTrackClassName}`}
        >
          <div className="w-1/4 shrink-0">
            <Introduction onNext={() => setCurrentScreen('guide')} />
          </div>
          <div className="w-1/4 shrink-0">
            <Guide onNext={() => setCurrentScreen('camera')} />
          </div>
          <div className="w-1/4 shrink-0">
            <Camera
              isActive={currentScreen === 'camera'}
              onDone={handleCameraDone}
            />
          </div>
          <div className="w-1/4 shrink-0">
            <NewsFeed
              photos={feedPhotos}
              onAddPhoto={() => setCurrentScreen('camera')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
