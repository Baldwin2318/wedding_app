import { useState } from 'react'
import Introduction from './components/Introduction'
import Guide from './components/Guide'
import Camera from './components/Camera'

function App() {
  const [currentScreen, setCurrentScreen] = useState('introduction')
  const screenClassName = {
    introduction: '',
    guide: 'show-guide',
    camera: 'show-camera',
  }[currentScreen]

  return (
    <div className="app-shell">
      <div className="screen-viewport">
        <div className={`screen-track ${screenClassName}`.trim()}>
          <div className="screen-panel">
            <Introduction onNext={() => setCurrentScreen('guide')} />
          </div>
          <div className="screen-panel">
            <Guide onNext={() => setCurrentScreen('camera')} />
          </div>
          <div className="screen-panel">
            <Camera />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
