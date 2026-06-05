import {
  PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY,
  PHOTO_ACCESS_UUID_STORAGE_KEY,
  getAccessCodeHeaders,
} from './accessCode'

export function getStoredProfile() {
  if (typeof window === 'undefined') {
    return {
      uuid: '',
      name: 'Guest',
      profileImageUrl: '',
    }
  }

  return {
    uuid: window.localStorage.getItem(PHOTO_ACCESS_UUID_STORAGE_KEY) || '',
    name: window.localStorage.getItem(PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY) || 'Guest',
    profileImageUrl: window.localStorage.getItem('wedding_profile_image_url') || '',
  }
}

export function saveStoredProfile(profile) {
  if (typeof window === 'undefined') {
    return
  }

  if (profile?.uuid) {
    window.localStorage.setItem(PHOTO_ACCESS_UUID_STORAGE_KEY, profile.uuid)
  }

  if (profile?.name) {
    window.localStorage.setItem(PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY, profile.name)
  }

  if (profile?.profileImageUrl || profile?.urlProfilePic) {
    window.localStorage.setItem(
      'wedding_profile_image_url',
      profile.profileImageUrl || profile.urlProfilePic,
    )
  }
}

export async function saveProfile({ name, file }) {
  const formData = new FormData()

  formData.append('name', name || 'Guest')

  if (file) {
    formData.append('file', file)
  }

  const response = await fetch('/api/profiles', {
    method: 'POST',
    headers: getAccessCodeHeaders(),
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Failed to save profile.')
  }

  const profile = {
    uuid: payload.profile?.uuid || '',
    name: payload.profile?.name || name || 'Guest',
    profileImageUrl: payload.profile?.urlProfilePic || '',
  }

  saveStoredProfile(profile)

  return profile
}
