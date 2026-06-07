import { useCallback, useEffect, useRef } from 'react'

const HISTORY_ENTRY_KEY = '__weddingAppView'

function isBrowserHistoryAvailable() {
  return typeof window !== 'undefined' && window.history && window.location
}

function createHistoryState(viewId) {
  return {
    ...(window.history.state || {}),
    [HISTORY_ENTRY_KEY]: viewId,
  }
}

function useBrowserBackStack() {
  const closeHandlersRef = useRef([])
  const pushedViewIdsRef = useRef([])
  const isHandlingPopRef = useRef(false)

  const closeTopView = useCallback(() => {
    const closeTop = closeHandlersRef.current.at(-1)

    if (!closeTop) {
      return false
    }

    isHandlingPopRef.current = true
    closeTop()
    closeHandlersRef.current = closeHandlersRef.current.slice(0, -1)
    pushedViewIdsRef.current = pushedViewIdsRef.current.slice(0, -1)
    queueMicrotask(() => {
      isHandlingPopRef.current = false
    })

    return true
  }, [])

  const pushView = useCallback((viewName, closeView) => {
    if (!isBrowserHistoryAvailable()) {
      return () => closeView()
    }

    const viewId = `${viewName}:${Date.now()}:${Math.random().toString(36).slice(2)}`

    window.history.pushState(createHistoryState(viewId), '', window.location.href)
    pushedViewIdsRef.current = [...pushedViewIdsRef.current, viewId]
    closeHandlersRef.current = [...closeHandlersRef.current, closeView]

    const dispose = () => {
      const index = pushedViewIdsRef.current.indexOf(viewId)

      if (index === -1) {
        closeView()
        return
      }

      if (index === pushedViewIdsRef.current.length - 1 && !isHandlingPopRef.current) {
        window.history.back()
        return
      }

      closeHandlersRef.current = closeHandlersRef.current.filter((_, handlerIndex) => handlerIndex !== index)
      pushedViewIdsRef.current = pushedViewIdsRef.current.filter((id) => id !== viewId)
      closeView()
    }

    dispose.remove = () => {
      const index = pushedViewIdsRef.current.indexOf(viewId)

      if (index === -1) {
        closeView()
        return
      }

      closeHandlersRef.current = closeHandlersRef.current.filter((_, handlerIndex) => handlerIndex !== index)
      pushedViewIdsRef.current = pushedViewIdsRef.current.filter((id) => id !== viewId)
      closeView()
    }

    return dispose
  }, [])

  useEffect(() => {
    if (!isBrowserHistoryAvailable()) {
      return undefined
    }

    function handlePopState() {
      closeTopView()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [closeTopView])

  return { closeTopView, pushView }
}

export default useBrowserBackStack
