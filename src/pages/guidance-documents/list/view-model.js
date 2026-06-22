import { homeCrumb } from '../../common/breadcrumbs.js'

/**
 * @param {{ items: object[], total: number, page: number, pageSize: number }} result
 * @returns {object}
 */
function listViewModel (result) {
  const totalPages = Math.ceil(result.total / result.pageSize)

  return {
    pageTitle: 'Guidance documents',
    documents: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages
    },
    breadcrumbs: [homeCrumb]
  }
}

export {
  listViewModel
}
