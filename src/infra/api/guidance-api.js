import { config } from '../../config/config.js'

const baseUrl = config.get('guidanceApi.url')

async function request (path, { method = 'GET', body, expected = [] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  if (response.ok) {
    return { ok: true, status: response.status, data: await response.json() }
  }

  if (expected.includes(response.status)) {
    return { ok: false, status: response.status, data: null }
  }

  const message =
    `Guidance API ${method} ${path} ` +
    `failed: ${response.status} ${response.statusText}`

  const error = new Error(message)

  error.statusCode = response.status

  throw error
}

async function listDocuments (page = 1, pageSize = 10) {
  return request(`/guidance/documents?page=${page}&page_size=${pageSize}`)
}

async function getDocument (id) {
  return request(`/guidance/documents/${id}`, { expected: [404] })
}

async function initiateUpload (payload) {
  return request('/guidance/documents', { method: 'POST', body: payload })
}

async function startAnalysis (documentId) {
  return request('/publishing/analyse', {
    method: 'POST',
    body: { documentId },
    expected: [404, 409]
  })
}

async function getLatestAnalysis (id) {
  return request(`/publishing/documents/${id}/analysis`, { expected: [404] })
}

export {
  listDocuments,
  getDocument,
  initiateUpload,
  startAnalysis,
  getLatestAnalysis
}
