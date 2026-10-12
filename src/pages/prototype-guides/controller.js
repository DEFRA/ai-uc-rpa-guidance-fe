import Boom from '@hapi/boom'

import { config } from '../../config/config.js'
import { statusCodes } from '../../constants/status-codes.js'
import { searchGuidance } from '../../services/guidance-search.js'
import { searchGuideSections } from '../../services/keyword-search.js'
import { isQuestion } from '../../services/query-kind.js'
import {
  getPrototypeGuide,
  getPrototypeGuideAsset,
  getPrototypeGuideSection,
  listPrototypeGuides,
  purgePrototypeGuides,
  startPrototypeGuidesUpload
} from '../../services/prototype-guides.js'
import {
  GUIDE_VIEW_COOKIE,
  guideViewOf,
  prototypeGuideViewModel,
  prototypeGuideSectionViewModel,
  prototypeGuidesViewModel,
  purgeViewModel,
  uploadViewModel
} from './view-model.js'

const LIST_PATH = '/prototype-guides'

const cdpUploaderBrowserBase = config.get('cdpUploader.browserUrl')

const IMAGE_CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff'
}

/**
 * A search of every guide: a question goes to the search agent, for an AI
 * summary and the sections that answer it; words to find are counted in
 * every guide's sections. Nothing typed is no search.
 *
 * @param {string} query
 * @returns {Promise<object | null>}
 */
async function searchEveryGuide (query) {
  if (!query) {
    return null
  }

  return isQuestion(query)
    ? { kind: 'question', ...(await searchGuidance(query)) }
    : { kind: 'keywords', results: await searchGuideSections(query) }
}

/**
 * Every guide the API currently serves to the prototype, with the answer to a
 * search above them when one was asked.
 *
 * The search agent is engaged only for a question: an empty box is a visit to
 * the page, not a query, and running a corpus-wide search for it would cost
 * the operator half a minute for nothing.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPrototypeGuides (request, h) {
  const { q = '', ...outcome } = request.query

  const [guides, search] = await Promise.all([
    listPrototypeGuides(),
    searchEveryGuide(q)
  ])

  return h.view('prototype-guides/page.njk', prototypeGuidesViewModel(guides, outcome, { query: q, search }))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Ask before purging: it cannot be undone.
 *
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPurgeConfirmation (_request, h) {
  const guides = await listPrototypeGuides()

  return h.view('prototype-guides/purge.njk', purgeViewModel(guides))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postPurge (_request, h) {
  const deleted = await purgePrototypeGuides()

  return h.redirect(`${LIST_PATH}?purged=${deleted}`)
}

/**
 * Open a CDP uploader session, then show the form that posts the zip to it.
 * CDP uploader sends the browser back to the list once the file is sent; the
 * guides are replaced when the scan finishes, a little after that.
 *
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function postUpload (_request, h) {
  const uploadId = await startPrototypeGuidesUpload(`${LIST_PATH}?uploaded=true`)

  return h.redirect(`${LIST_PATH}/upload?uploadId=${encodeURIComponent(uploadId)}`)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject}
 */
function getUploadForm (request, h) {
  const { uploadId } = request.query
  const uploadUrl = `${cdpUploaderBrowserBase ?? ''}/upload-and-scan/${uploadId}`

  return h.view('prototype-guides/upload.njk', uploadViewModel(uploadUrl))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * One guide's latest version, rendered whole or as one step: one section.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPrototypeGuideView (request, h) {
  const found = await getPrototypeGuide(request.params.documentId)

  if (!found) {
    throw Boom.notFound('Prototype guide not found')
  }

  const view = guideViewOf(request.query.view, request.state[GUIDE_VIEW_COOKIE])
  const viewModel = prototypeGuideViewModel(found, { ...request.query, view })

  if (!viewModel) {
    throw Boom.notFound('Prototype guide step not found')
  }

  const response = h.view('prototype-guides/guide.njk', viewModel)
    .code(statusCodes.HTTP_STATUS_OK)

  return choseFormat(request) ? response.state(GUIDE_VIEW_COOKIE, view) : response
}

/**
 * Whether the reader chose a format: one named in the address of a page they
 * opened. Not one a script asked for, as the stepper's search does to read
 * the whole guide; browsers mark a page being opened as a navigation, and a
 * browser too old to say is taken as opening one.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {boolean}
 */
function choseFormat (request) {
  const mode = request.headers['sec-fetch-mode']

  return Boolean(request.query.view) && (!mode || mode === 'navigate')
}

/**
 * One section of a guide's latest version, rendered: where a search result
 * for that section opens.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPrototypeGuideSectionView (request, h) {
  const { documentId, sectionNumber } = request.params

  const found = await getPrototypeGuideSection(documentId, sectionNumber)

  if (!found) {
    throw Boom.notFound('Prototype guide section not found')
  }

  return h.view('prototype-guides/section.njk', prototypeGuideSectionViewModel(found))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * Proxy one of a guide's pictures from the API to the browser.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPrototypeGuideImage (request, h) {
  const { documentId, assetId } = request.params

  const buffer = await getPrototypeGuideAsset(documentId, assetId)

  if (!buffer) {
    throw Boom.notFound('Image not found')
  }

  const ext = assetId.split('.').pop().toLowerCase()
  const contentType = IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream'

  return h.response(buffer).type(contentType)
}

export {
  getPrototypeGuides,
  getPurgeConfirmation,
  postPurge,
  postUpload,
  getUploadForm,
  getPrototypeGuideView,
  getPrototypeGuideSectionView,
  getPrototypeGuideImage
}
