import Boom from '@hapi/boom'

import { config } from '../../../config/config.js'
import { statusCodes } from '../../../constants/status-codes.js'
import {
  getPrototypeGuide,
  getPrototypeGuideAsset,
  listPrototypeGuides,
  purgePrototypeGuides,
  startPrototypeGuidesUpload
} from '../../../services/prototype-guides.js'
import {
  prototypeGuideViewModel,
  prototypeGuidesViewModel,
  purgeViewModel,
  uploadViewModel
} from './view-model.js'

const LIST_PATH = '/admin/prototype-guides'

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
 * Every guide the API currently serves to the prototype.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').ResponseObject>}
 */
async function getPrototypeGuides (request, h) {
  const guides = await listPrototypeGuides()

  return h.view('admin/prototype-guides/page.njk', prototypeGuidesViewModel(guides, request.query))
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

  return h.view('admin/prototype-guides/purge.njk', purgeViewModel(guides))
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

  return h.view('admin/prototype-guides/upload.njk', uploadViewModel(uploadUrl))
    .code(statusCodes.HTTP_STATUS_OK)
}

/**
 * One guide's latest version, rendered.
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

  return h.view('admin/prototype-guides/guide.njk', prototypeGuideViewModel(found))
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
  getPrototypeGuideImage
}
