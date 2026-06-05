export const PHOTO_ACCESS_UUID_STORAGE_KEY = 'wedding_photo_access_uuid'
export const PHOTO_ACCESS_GUEST_NAME_STORAGE_KEY = 'wedding_photo_access_guest_name'

export function getAccessCodeHeaders() {
  if (typeof window === 'undefined') {
    return {}
  }

  const accessCodeUuid = window.localStorage.getItem(PHOTO_ACCESS_UUID_STORAGE_KEY)

  return accessCodeUuid
    ? {
        'x-access-code-uuid': accessCodeUuid,
      }
    : {}
}
