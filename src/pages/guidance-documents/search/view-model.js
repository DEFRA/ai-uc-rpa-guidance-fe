import { guidanceDocumentsBreadcrumbs } from '../../common/breadcrumbs.js'

/**
 * @param {string} query
 * @param {object|null} search The search, or null when nothing was asked.
 * @returns {object}
 */
function searchViewModel (query, search) {
  return {
    pageTitle: query ? `Search results for ${query}` : 'Search guidance',
    query,
    answer: search?.answer ?? null,
    results: search?.results ?? [],
    searched: Boolean(search),
    breadcrumbs: guidanceDocumentsBreadcrumbs()
  }
}

export {
  searchViewModel
}
