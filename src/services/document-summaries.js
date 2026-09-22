import * as guidanceApi from '../infra/api/guidance-api.js'

/**
 * Every document summary the service holds, most recently rebuilt first.
 *
 * @returns {Promise<object[]>}
 */
async function listDocumentSummaries () {
  const res = await guidanceApi.listSummaries()
  return res.data.items
}

/**
 * Rebuild the summary for each document, one model pass per document.
 *
 * This is a long call: it returns only once every summary has been built or
 * has failed.
 *
 * @param {string[]} documentIds
 * @returns {Promise<{ items: object[], failures: object[] }>}
 */
async function rebuildDocumentSummaries (documentIds) {
  const res = await guidanceApi.rebuildSummaries(documentIds)
  return res.data
}

export {
  listDocumentSummaries,
  rebuildDocumentSummaries
}
