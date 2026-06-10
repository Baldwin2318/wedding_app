import { useEffect, useMemo, useRef, useState } from 'react'
import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'
import { completeWendGame, fetchTodayWendGame } from '../lib/wendGame'

const BOARD_SIZE = 6
const WORD_COLORS = [
  { bg: '#08aeea', bgSoft: '#bdeeff', text: '#020617' },
  { bg: '#8b5cf6', bgSoft: '#ddd6fe', text: '#111827' },
  { bg: '#63d11f', bgSoft: '#d9f99d', text: '#111827' },
]

const WORD_PATHS = [
  [
    [0, 3],
    [0, 4],
    [0, 5],
  ],
  [
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [5, 0],
    [5, 1],
    [5, 2],
    [5, 3],
    [5, 4],
  ],
]

const BLOCKER_CELLS = new Set(['1:2', '2:2', '3:2', '1:4', '2:4', '3:4'])

function formatElapsed(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)

  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

function cellKey(row, col) {
  return `${row}:${col}`
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

function buildPuzzle(words) {
  const cells = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      row,
      col,
      key: cellKey(row, col),
      letter: '',
      wordIndex: null,
      isBlocker: BLOCKER_CELLS.has(cellKey(row, col)),
    })),
  )

  words.forEach((word, wordIndex) => {
    WORD_PATHS[wordIndex]?.forEach(([row, col], letterIndex) => {
      cells[row][col] = {
        ...cells[row][col],
        letter: word[letterIndex]?.toUpperCase() || '',
        wordIndex,
        isBlocker: false,
      }
    })
  })

  const filler = 'WENDGAMELOVEJOYBRIDEPARTY'
  let fillerIndex = 0

  return cells.flat().map((cell) => {
    if (cell.isBlocker || cell.letter) {
      return cell
    }

    return {
      ...cell,
      letter: filler[fillerIndex++ % filler.length],
    }
  })
}

function getCellFromPointer(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-wend-cell]')

  if (!element) {
    return null
  }

  return {
    row: Number(element.getAttribute('data-row')),
    col: Number(element.getAttribute('data-col')),
    key: element.getAttribute('data-key'),
  }
}

function WendBoard({ words, solvedWords, onSolveWord, disabled }) {
  const [selection, setSelection] = useState([])
  const [hintWordIndex, setHintWordIndex] = useState(null)
  const boardRef = useRef(null)
  const cells = useMemo(() => buildPuzzle(words), [words])
  const solvedKeys = useMemo(() => {
    const keys = new Set()

    solvedWords.forEach((isSolved, wordIndex) => {
      if (!isSolved) return

      WORD_PATHS[wordIndex].forEach(([row, col]) => keys.add(cellKey(row, col)))
    })

    return keys
  }, [solvedWords])
  const selectedKeys = useMemo(() => new Set(selection.map((cell) => cell.key)), [selection])

  function finishSelection(nextSelection = selection) {
    const guessedWord = nextSelection
      .map((cell) => cells.find((candidate) => candidate.key === cell.key)?.letter || '')
      .join('')
      .toLowerCase()

    const matchIndex = words.findIndex((word, index) => !solvedWords[index] && word === guessedWord)

    if (matchIndex >= 0) {
      onSolveWord(matchIndex)
    }

    setSelection([])
  }

  function startSelection(event) {
    if (disabled) return

    const cell = getCellFromPointer(event)
    if (!cell || BLOCKER_CELLS.has(cell.key) || solvedKeys.has(cell.key)) return

    event.currentTarget.setPointerCapture?.(event.pointerId)
    setSelection([cell])
  }

  function extendSelection(event) {
    if (!selection.length || disabled) return

    const cell = getCellFromPointer(event)
    if (!cell || BLOCKER_CELLS.has(cell.key) || solvedKeys.has(cell.key)) return

    setSelection((current) => {
      const existingIndex = current.findIndex((selected) => selected.key === cell.key)

      if (existingIndex === current.length - 2) {
        return current.slice(0, -1)
      }

      if (existingIndex >= 0) {
        return current
      }

      const previous = current[current.length - 1]
      if (!previous || !isAdjacent(previous, cell)) {
        return current
      }

      const nextSelection = [...current, cell]
      const guessedWord = nextSelection
        .map((selected) => cells.find((candidate) => candidate.key === selected.key)?.letter || '')
        .join('')
        .toLowerCase()

      const matchIndex = words.findIndex((word, index) => !solvedWords[index] && word === guessedWord)
      if (matchIndex >= 0) {
        window.setTimeout(() => finishSelection(nextSelection), 60)
      }

      return nextSelection
    })
  }

  function showHint() {
    const nextIndex = solvedWords.findIndex((isSolved) => !isSolved)
    setHintWordIndex(nextIndex >= 0 ? nextIndex : null)
  }

  return (
    <div className="rounded-[34px] bg-zinc-100 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div
        ref={boardRef}
        className="relative grid touch-none overflow-hidden rounded-md border-4 border-zinc-700 bg-white select-none"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
        onPointerDown={startSelection}
        onPointerMove={extendSelection}
        onPointerUp={() => finishSelection()}
        onPointerCancel={() => setSelection([])}
      >
        {cells.map((cell) => {
          const color = cell.wordIndex === null ? null : WORD_COLORS[cell.wordIndex]
          const isSolved = solvedKeys.has(cell.key)
          const isSelected = selectedKeys.has(cell.key)
          const isHinted = hintWordIndex !== null && WORD_PATHS[hintWordIndex]?.[0]?.join(':') === cell.key
          const background = cell.isBlocker
            ? '#a3a3a3'
            : isSolved || isSelected
              ? color?.bg || '#e4e4e7'
              : color?.bgSoft || '#f4f4f5'

          return (
            <div
              key={cell.key}
              data-wend-cell
              data-row={cell.row}
              data-col={cell.col}
              data-key={cell.key}
              className={`relative flex aspect-square items-center justify-center border border-zinc-300 text-xl font-black transition ${
                cell.isBlocker ? 'shadow-inner' : ''
              } ${isHinted ? 'ring-4 ring-amber-300 ring-inset' : ''}`}
              style={{ background, color: color?.text || '#111827' }}
            >
              {!cell.isBlocker ? cell.letter : null}
              {isSolved ? (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-sky-500 bg-white text-sm font-black text-emerald-600">
                  ✓
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-2">
        {words.map((word, wordIndex) => {
          const color = WORD_COLORS[wordIndex]
          return (
            <div key={word} className="flex items-center gap-1.5">
              {word.split('').map((letter, letterIndex) => (
                <span
                  key={`${word}-${letterIndex}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black uppercase text-zinc-950"
                  style={{ backgroundColor: solvedWords[wordIndex] ? color.bg : '#e4e4e7' }}
                >
                  {solvedWords[wordIndex] ? letter : ''}
                </span>
              ))}
              {solvedWords[wordIndex] ? <span className="text-lg font-black text-emerald-600">✓</span> : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!selection.length || disabled}
          onClick={() => setSelection([])}
          className="rounded-full bg-zinc-200 py-3 text-sm font-bold text-zinc-500 transition active:scale-95 disabled:opacity-50"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={disabled || solvedWords.every(Boolean)}
          onClick={showHint}
          className="rounded-full bg-zinc-200 py-3 text-sm font-bold text-zinc-500 transition active:scale-95 disabled:opacity-50"
        >
          Hint
        </button>
      </div>
    </div>
  )
}

export default function WendGame({ currentProfile, onBack }) {
  const startedAtRef = useRef(0)
  const [game, setGame] = useState(null)
  const [solvedWords, setSolvedWords] = useState([false, false, false])
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const words = game?.words || []
  const isComplete = solvedWords.length === words.length && words.length > 0 && solvedWords.every(Boolean)

  useEffect(() => {
    let isCancelled = false

    async function loadGame() {
      try {
        setIsLoading(true)
        setError('')
        const payload = await fetchTodayWendGame()

        if (isCancelled) return

        setGame(payload)
        setResult(payload.previousScore)
        startedAtRef.current = performance.now()
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load Wend game.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadGame()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (isLoading || game?.alreadyPlayed || result) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAtRef.current)
    }, 50)

    return () => window.clearInterval(timer)
  }, [game?.alreadyPlayed, isLoading, result])

  useEffect(() => {
    if (!isComplete || isSaving || result) {
      return
    }

    let isCancelled = false

    async function saveScore() {
      const finalElapsedMs = Math.round(performance.now() - startedAtRef.current)

      try {
        setIsSaving(true)
        const payload = await completeWendGame({
          words,
          elapsedMs: finalElapsedMs,
        })

        if (isCancelled) return

        setResult({
          score: payload.score,
          elapsedMs: payload.elapsedMs,
          completedAt: payload.completedAt,
        })

        const refreshed = await fetchTodayWendGame()
        if (!isCancelled) {
          setGame(refreshed)
        }
      } catch (saveError) {
        if (!isCancelled) {
          setError(saveError instanceof Error ? saveError.message : 'Failed to save score.')
        }
      } finally {
        if (!isCancelled) {
          setIsSaving(false)
        }
      }
    }

    saveScore()

    return () => {
      isCancelled = true
    }
  }, [isComplete, isSaving, result, words])

  function solveWord(wordIndex) {
    setSolvedWords((current) => current.map((isSolved, index) => index === wordIndex || isSolved))
  }

  return (
    <section className="fixed inset-0 flex min-h-0 w-full flex-col overflow-hidden bg-[#f3f4f6] text-zinc-950">
      <header className="z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 transition active:scale-95"
        >
          Back
        </button>

        <div className="text-center">
          <p className="text-base font-black">Wend game</p>
          <p className="text-xs font-medium text-zinc-500">Daily word path</p>
        </div>

        <ProfileAvatar
          src={currentProfile?.urlProfilePic || ''}
          name={currentProfile?.name || 'Guest'}
          className="h-10 w-10 ring-2 ring-zinc-200"
        />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-[448px] space-y-4">
          <div className="rounded-[32px] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Today</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Connect the words</h1>
              </div>
              <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-right">
                <p className="text-[11px] font-bold text-zinc-400">Timer</p>
                <p className="font-mono text-lg font-black">{formatElapsed(result?.elapsedMs ?? elapsedMs)}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[30px] bg-white p-6 text-center text-zinc-950">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950" />
              <p className="text-sm font-bold">Loading today’s game...</p>
            </div>
          ) : error ? (
            <div className="rounded-[30px] bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>
          ) : game?.alreadyPlayed ? (
            <div className="rounded-[30px] bg-white p-6 text-center text-zinc-950">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Completed</p>
              <p className="mt-2 text-4xl font-black">{result?.score}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-500">Come back tomorrow for the next board.</p>
            </div>
          ) : (
            <WendBoard
              words={words}
              solvedWords={solvedWords}
              onSolveWord={solveWord}
              disabled={isSaving || Boolean(result)}
            />
          )}

          <details className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <summary className="cursor-pointer px-5 py-4 text-sm font-black">How to play</summary>
            <div className="border-t border-zinc-100 px-5 pb-5 pt-3 text-sm leading-6 text-zinc-600">
              Drag across adjacent letters to form the 3-letter, 4-letter, and 5-letter words. Correct words lock automatically. Faster finish means a higher score.
            </div>
          </details>

          {result ? (
            <div className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Score saved</p>
              <p className="mt-2 text-4xl font-black">{result.score}</p>
              <p className="mt-1 text-sm font-bold">Finished in {formatElapsed(result.elapsedMs)}</p>
            </div>
          ) : null}

          <section className="rounded-[30px] bg-white p-5 text-zinc-950 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">High score</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">Today</span>
            </div>

            {game?.leaderboard?.length ? (
              <div className="space-y-3">
                {game.leaderboard.map((entry, index) => (
                  <div key={entry.profile.uuid} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <ProfileAvatar
                      src={entry.profile.urlProfilePic || ''}
                      name={entry.profile.name || 'Guest'}
                      className="h-10 w-10 shadow-none ring-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-black">{entry.profile.name || 'Guest'}</p>
                        {entry.profile.verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                      </div>
                      <p className="text-xs font-semibold text-zinc-400">{formatElapsed(entry.elapsedMs)}</p>
                    </div>
                    <p className="text-sm font-black">{entry.score}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-zinc-500">No scores yet. Be the first today.</p>
            )}
          </section>
        </div>
      </main>
    </section>
  )
}
