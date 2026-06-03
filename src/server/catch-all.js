import { statusCodes } from '../constants/status-codes.js'

function statusCodeMessage (statusCode) {
  switch (statusCode) {
    case statusCodes.HTTP_STATUS_NOT_FOUND:
      return 'Page not found'
    case statusCodes.HTTP_STATUS_FORBIDDEN:
      return 'Forbidden'
    case statusCodes.HTTP_STATUS_UNAUTHORIZED:
      return 'Unauthorized'
    case statusCodes.HTTP_STATUS_BAD_REQUEST:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

function catchAll (request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR) {
    request.logger.error(response?.stack)
  }

  return h
    .view('common/error', {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}

export {
  catchAll
}
