import { constants as http2StatusCodes } from 'node:http2'

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
  return request(`/guidance/documents/${id}`, { expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND] })
}

async function initiateUpload (payload) {
  return request('/guidance/documents', { method: 'POST', body: payload })
}

async function startAnalysis (documentId) {
  return request('/publishing/analyse', {
    method: 'POST',
    body: { documentId },
    expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND, http2StatusCodes.HTTP_STATUS_CONFLICT]
  })
}

async function getLatestAnalysis (id) {
  return request(`/publishing/documents/${id}/analysis`, { expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND] })
}

export {
  listDocuments,
  getDocument,
  initiateUpload,
  startAnalysis,
  getLatestAnalysis
}
