import * as guidanceApi from '../infra/api/guidance-api.js'

/**
 * Search the guidance index on the operator's behalf.
 *
 * This is a long call: the search agent reads the whole index, then reads
 * each section it proposes to check that it really answers the query.
 *
 * @param {string} query
 * @returns {Promise<object>}
 */
async function searchGuidance (query) {
  const res = await guidanceApi.searchGuidance(query)
  return res.data
}

export {
  searchGuidance
}
