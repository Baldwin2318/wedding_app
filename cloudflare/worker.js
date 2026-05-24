const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function createJsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  })
}

function sanitizeFileName(name = 'photo.jpg') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const allowedOrigin = env.ALLOWED_ORIGIN || origin || '*'

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': allowedOrigin,
        },
      })
    }

    if (request.method !== 'POST') {
      return createJsonResponse(
        { error: 'Method not allowed.' },
        {
          status: 405,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
          },
        },
      )
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file')
      const captionValue = formData.get('caption')
      const caption =
        typeof captionValue === 'string' ? captionValue.trim() : ''

      if (!(file instanceof File)) {
        return createJsonResponse(
          { error: 'Missing uploaded file.' },
          {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': allowedOrigin,
            },
          },
        )
      }

      const extension = file.name.split('.').pop() || 'jpg'
      const objectKey = `wedding-photos/${Date.now()}-${crypto.randomUUID()}.${extension}`

      await env.WEDDING_PHOTOS.put(objectKey, file.stream(), {
        httpMetadata: {
          contentType: file.type || 'image/jpeg',
        },
        customMetadata: {
          caption,
          originalName: sanitizeFileName(file.name),
        },
      })

      const publicBaseUrl = env.PUBLIC_BUCKET_BASE_URL?.replace(/\/$/, '')

      if (!publicBaseUrl) {
        return createJsonResponse(
          { error: 'PUBLIC_BUCKET_BASE_URL is not configured.' },
          {
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': allowedOrigin,
            },
          },
        )
      }

      return createJsonResponse(
        {
          key: objectKey,
          imageUrl: `${publicBaseUrl}/${objectKey}`,
          caption,
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
          },
        },
      )
    } catch (error) {
      return createJsonResponse(
        {
          error:
            error instanceof Error ? error.message : 'Unexpected upload error.',
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
          },
        },
      )
    }
  },
}
