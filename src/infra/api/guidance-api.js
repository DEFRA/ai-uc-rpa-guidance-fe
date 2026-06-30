import { constants as http2StatusCodes } from 'node:http2'

import { config } from '../../config/config.js'

const baseUrl = config.get('guidanceApi.url')

const responseParsers = {
  json: (res) => res.json(),
  text: (res) => res.text(),
  arrayBuffer: async (res) => Buffer.from(await res.arrayBuffer())
}

async function request (path, { method = 'GET', body, expected = [], responseType = 'json' } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  if (response.ok) {
    const parser = responseParsers[responseType]
    const data = await parser(response)
    return { ok: true, status: response.status, data }
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

async function getDocumentManifest (id) {
  return request(`/guidance/documents/${id}/manifest`, {
    expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND]
  })
}

async function getDocumentSection (id, sectionNumber) {
  return request(
    `/guidance/documents/${id}/sections/${encodeURIComponent(sectionNumber)}`,
    {
      responseType: 'text',
      expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND]
    }
  )
}

async function getDocumentImage (documentId, filename) {
  return request(
    `/guidance/documents/${documentId}/images/${encodeURIComponent(filename)}`,
    {
      responseType: 'arrayBuffer',
      expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND]
    }
  )
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

async function startReview (documentId) {
  return request('/critique/jobs', {
    method: 'POST',
    body: { documentId },
    expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND, http2StatusCodes.HTTP_STATUS_CONFLICT]
  })
}

async function getReviewJob (jobId) {
  return request(`/critique/jobs/${jobId}`, { expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND] })
}

async function getLatestReview (documentId) {
  return request(`/critique/documents/${documentId}/analysis`, {
    expected: [http2StatusCodes.HTTP_STATUS_NOT_FOUND]
  })
}

export {
  listDocuments,
  getDocument,
  getDocumentManifest,
  getDocumentSection,
  getDocumentImage,
  initiateUpload,
  startAnalysis,
  getLatestAnalysis,
  startReview,
  getReviewJob,
  getLatestReview
}
