import * as confirmationController from './upload/confirmation/controller.js'
import * as listController from './list/controller.js'
import * as uploadController from './upload/controller.js'
import * as uploadFileController from './upload/file/controller.js'

const routes = [
  {
    method: 'GET',
    path: '/guidance-documents',
    handler: listController.getGuidanceDocuments
  },
  {
    method: 'GET',
    path: '/guidance-documents/upload',
    handler: uploadController.getUploadGuidanceDocument
  },
  {
    method: 'POST',
    path: '/guidance-documents/upload',
    handler: uploadController.postUploadGuidanceDocument
  },
  {
    method: 'GET',
    path: '/guidance-documents/upload/file',
    handler: uploadFileController.getUploadGuidanceDocumentFile
  },
  {
    method: 'GET',
    path: '/guidance-documents/upload/confirmation',
    handler: confirmationController.getUploadConfirmation
  }
]

const guidanceDocumentsRouter = {
  plugin: {
    name: 'guidanceDocumentsRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  guidanceDocumentsRouter
}
