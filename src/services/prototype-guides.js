import * as guidanceApi from '../infra/api/guidance-api.js'

// Prototype guides are what the API serves to the AI Hub prototype: parsed
// elsewhere and synced into the API's bucket by hand, indexed by a single
// manifest. This app only ever reads them.

/**
 * Every guide in the manifest, keyed by the name it is filed under. An empty
 * list when no manifest has been synced yet -- the API answers 404 then, and
 * that is the normal state of a fresh environment, not an error.
 *
 * @returns {Promise<object[]>}
 */
async function listPrototypeGuides () {
  const res = await guidanceApi.getPrototypeGuidesManifest()

  if (!res.ok) {
    return []
  }

  return Object.entries(res.data).map(([name, guide]) => ({ name, ...guide }))
}

/**
 * A guide's manifest entry and the Markdown of its latest version, or null if
 * either is missing.
 *
 * @param {string} documentId
 * @returns {Promise<{ guide: object, markdown: string } | null>}
 */
async function getPrototypeGuide (documentId) {
  const guides = await listPrototypeGuides()
  const guide = guides.find((candidate) => candidate.documentId === documentId)

  if (!guide) {
    return null
  }

  const res = await guidanceApi.getPrototypeGuideContent(documentId)

  return res.ok ? { guide, markdown: res.data } : null
}

/**
 * @param {string} documentId
 * @param {string} assetId
 * @returns {Promise<Buffer | null>}
 */
async function getPrototypeGuideAsset (documentId, assetId) {
  const res = await guidanceApi.getPrototypeGuideAsset(documentId, assetId)
  return res.ok ? res.data : null
}

/**
 * Delete every prototype guide from the bucket. Irreversible.
 *
 * @returns {Promise<number>} How many files were deleted.
 */
async function purgePrototypeGuides () {
  const res = await guidanceApi.purgePrototypeGuides()
  return res.data.deleted
}

/**
 * Open a CDP uploader session for a zip that replaces every prototype guide.
 *
 * @param {string} redirect Where CDP uploader sends the browser afterwards.
 * @returns {Promise<string>} The upload id.
 */
async function startPrototypeGuidesUpload (redirect) {
  const res = await guidanceApi.initiatePrototypeGuidesUpload(redirect)
  return res.data.uploadId
}

export {
  listPrototypeGuides,
  getPrototypeGuide,
  getPrototypeGuideAsset,
  purgePrototypeGuides,
  startPrototypeGuidesUpload
}
