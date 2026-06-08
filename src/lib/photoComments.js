import { getAccessCodeHeaders } from './accessCode'

async function readJsonResponse(response, fallbackError) {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || fallbackError)
  }

  return payload
}

export async function fetchPhotoComments(photoId) {
  const response = await fetch(`/api/photos/${photoId}/comments`, {
    headers: {
      ...getAccessCodeHeaders(),
    },
  })

  const payload = await readJsonResponse(response, 'Failed to load comments.')

  return Array.isArray(payload?.comments) ? payload.comments : []
}

export async function fetchPhotoLikes(photoId) {
  const response = await fetch(`/api/photos/${photoId}/likes`, {
    headers: {
      ...getAccessCodeHeaders(),
    },
  })

  const payload = await readJsonResponse(response, 'Failed to load likes.')

  return Array.isArray(payload?.likes) ? payload.likes : []
}

export async function addPhotoComment(photoId, body) {
  const response = await fetch(`/api/photos/${photoId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAccessCodeHeaders(),
    },
    body: JSON.stringify({ body }),
  })

  const payload = await readJsonResponse(response, 'Failed to add comment.')

  return {
    comment: payload.comment,
    commentsCount: payload.commentsCount ?? null,
  }
}

export async function updatePhotoComment(photoId, commentId, body) {
  const response = await fetch(`/api/photos/${photoId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAccessCodeHeaders(),
    },
    body: JSON.stringify({ body }),
  })

  const payload = await readJsonResponse(response, 'Failed to update comment.')

  return payload.comment
}

export async function deletePhotoComment(photoId, commentId) {
  const response = await fetch(`/api/photos/${photoId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      ...getAccessCodeHeaders(),
    },
  })

  const payload = await readJsonResponse(response, 'Failed to delete comment.')

  return {
    id: String(payload?.id || commentId),
    photoId: String(payload?.photoId || photoId),
    commentsCount: payload?.commentsCount ?? null,
  }
}

export async function togglePhotoCommentLike(photoId, commentId, shouldLike) {
  const response = await fetch(`/api/photos/${photoId}/comments/${commentId}/like`, {
    method: shouldLike ? 'POST' : 'DELETE',
    headers: {
      ...getAccessCodeHeaders(),
    },
  })

  const payload = await readJsonResponse(
    response,
    shouldLike ? 'Failed to like comment.' : 'Failed to unlike comment.',
  )

  return {
    id: String(payload?.id || commentId),
    photoId: String(payload?.photoId || photoId),
    likesCount: payload?.likesCount ?? 0,
    likedByCurrentVisitor: Boolean(payload?.likedByCurrentVisitor),
    likerNames: Array.isArray(payload?.likerNames) ? payload.likerNames : [],
  }
}
