import { useEffect, useMemo, useRef, useState } from 'react'
import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'
import { completeWendGame, fetchTodayWendGame } from '../lib/wendGame'

function formatElapsed(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)

  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

function normalizeGuess(value) {
  return value.replace(/[^a-z]/gi, '').toLowerCase()
}

function WordInput({ length, value, isCorrect, onChange, disabled }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
          {length} letters
        </p>
        <p className={`text-xs font-bold ${isCorrect ? 'text-emerald-600' : 'text-zinc-400'}`}>
          {isCorrect ? 'Correct' : 'Guess'}
        </p>
      </div>

      <div className="flex gap-2">
        {Array.from({ length }).map((_, index) => (
          <div
            key={index}
            className={`flex h-12 flex-1 items-center justify-center rounded-2xl border text-xl font-black uppercase transition ${
              isCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-zinc-200 bg-zinc-50 text-zinc-950'
            }`}
          >
            {value[index] || ''}
          </div>
        ))}
      </div>

      <input
        value={value}
        maxLength={length}
        disabled={disabled || isCorrect}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center text-base font-bold uppercase text-zinc-950 outline-none transition focus:border-zinc-950 disabled:opacity-60"
        placeholder={`${length}-letter word`}
        onChange={(event) => onChange(normalizeGuess(event.target.value).slice(0, length))}
      />
    </div>
  )
}

export default function WendGame({ currentProfile, onBack }) {
  const startedAtRef = useRef(0)
  const [game, setGame] = useState(null)
  const [guesses, setGuesses] = useState(['', '', ''])
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const words = game?.words || []
  const correctByIndex = useMemo(
    () => words.map((word, index) => guesses[index] === word),
    [guesses, words],
  )
  const isComplete = correctByIndex.length === 3 && correctByIndex.every(Boolean)

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
          words: guesses,
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
  }, [guesses, isComplete, isSaving, result])

  function updateGuess(index, value) {
    setGuesses((current) =>
      current.map((guess, currentIndex) => (currentIndex === index ? value : guess)),
    )
  }

  return (
    <section className="fixed inset-0 flex min-h-0 w-full flex-col overflow-hidden bg-zinc-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f9a8d4_0,#18181b_36%,#020617_100%)] opacity-80" />

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition active:scale-95"
        >
          Back
        </button>

        <div className="text-center">
          <p className="text-base font-black">Wend game</p>
          <p className="text-xs font-medium text-white/60">Daily wedding word sprint</p>
        </div>

        <ProfileAvatar
          src={currentProfile?.urlProfilePic || ''}
          name={currentProfile?.name || 'Guest'}
          className="h-10 w-10 ring-2 ring-white/20"
        />
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-[520px] space-y-5">
          <div className="rounded-[34px] border border-white/15 bg-white/15 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/55">
                  Today
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">
                  Guess 3 words
                </h1>
              </div>

              <div className="rounded-3xl bg-black/30 px-4 py-3 text-right">
                <p className="text-xs font-bold text-white/50">Timer</p>
                <p className="font-mono text-xl font-black">
                  {formatElapsed(result?.elapsedMs ?? elapsedMs)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/70">
              One 3-letter, one 4-letter, and one 5-letter word. When a word is right,
              it locks automatically. No submit button.
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-[30px] bg-white p-6 text-center text-zinc-950">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950" />
              <p className="text-sm font-bold">Loading today’s game...</p>
            </div>
          ) : error ? (
            <div className="rounded-[30px] bg-red-50 p-5 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : game?.alreadyPlayed ? (
            <div className="rounded-[30px] bg-white p-6 text-center text-zinc-950">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">
                Completed
              </p>
              <p className="mt-2 text-4xl font-black">{result?.score}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                Come back tomorrow for the next set.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[3, 4, 5].map((length, index) => (
                <WordInput
                  key={length}
                  length={length}
                  value={guesses[index]}
                  isCorrect={Boolean(correctByIndex[index])}
                  disabled={isSaving || Boolean(result)}
                  onChange={(value) => updateGuess(index, value)}
                />
              ))}
            </div>
          )}

          {result ? (
            <div className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
                Score saved
              </p>
              <p className="mt-2 text-4xl font-black">{result.score}</p>
              <p className="mt-1 text-sm font-bold">
                Finished in {formatElapsed(result.elapsedMs)}
              </p>
            </div>
          ) : null}

          <section className="rounded-[30px] bg-white p-5 text-zinc-950 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">High score</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                Today
              </span>
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
                        <p className="truncate text-sm font-black">
                          {entry.profile.name || 'Guest'}
                        </p>
                        {entry.profile.verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                      </div>
                      <p className="text-xs font-semibold text-zinc-400">
                        {formatElapsed(entry.elapsedMs)}
                      </p>
                    </div>

                    <p className="text-sm font-black">{entry.score}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-zinc-500">
                No scores yet. Be the first today.
              </p>
            )}
          </section>
        </div>
      </main>
    </section>
  )
}
