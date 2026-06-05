import { useEffect, useRef, useState } from 'react'
import ProfileAvatar from './ProfileAvatar'

function ProfileSettings({
  isOpen = false,
  profile = null,
  isSaving = false,
  error = '',
  onClose,
  onSave,
}) {
  const [name, setName] = useState(profile?.name || 'Guest')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setName(profile?.name || 'Guest')
    setSelectedFile(null)
    setPreviewUrl('')
  }, [isOpen, profile?.name])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!isOpen) {
    return null
  }

  const profileImage = previewUrl || profile?.urlProfilePic || profile?.profileImage || ''

  function handlePickFile(event) {
    const nextFile = event.target.files?.[0]

    if (!nextFile) {
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
    event.target.value = ''
  }

  async function handleSave() {
    await onSave?.({
      name,
      file: selectedFile,
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/35 p-4 backdrop-blur-[3px] sm:items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePickFile}
      />

      <div className="w-full max-w-[420px] overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
        <div className="border-b border-zinc-200/80 px-5 py-4">
          <h2 className="text-center text-base font-semibold text-zinc-950">
            Profile
          </h2>
        </div>

        <div className="space-y-6 px-5 py-6">
          <div className="flex justify-center">
            <button
              type="button"
              className="group relative inline-flex rounded-full text-left"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile picture"
            >
              <ProfileAvatar
                src={profileImage}
                name={name || profile?.name || 'Guest'}
                className="h-28 w-28 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
              />
              <span className="absolute bottom-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-2xl leading-none text-white shadow-[0_8px_20px_rgba(14,165,233,0.35)] transition group-active:scale-95">
                +
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-zinc-600"
            >
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings
