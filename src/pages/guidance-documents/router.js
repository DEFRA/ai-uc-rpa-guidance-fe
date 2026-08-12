import Boom from '@hapi/boom'
import Joi from 'joi'

import * as confirmationController from './upload/confirmation/controller.js'
import * as editController from './edit/controller.js'
import * as listController from './list/controller.js'
import * as uploadController from './upload/controller.js'
import * as uploadFileController from './upload/file/controller.js'
import * as viewerController from './viewer/controller.js'

const sectionParams = Joi.object({
  documentId: Joi.string().required(),
  sectionNumber: Joi.string().pattern(/^\d+(\.\d+)*$/).required()
})

const sectionNotFound = (_request, _h, err) => {
  throw Boom.notFound('Guidance section not found', err)
}

const editPayload = Joi.object({
  heading: Joi.string().trim().max(500).required(),
  markdown: Joi.string().allow('').max(1000000).required()
})

const routes = [
  {
    method: 'GET',
    path: '/guidance-documents/{documentId}/assets/{filename}',
    handler: viewerController.getGuidanceDocumentImage,
    options: {
      validate: {
        params: Joi.object({
          documentId: Joi.string().uuid().required(),
          filename: Joi.string().pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).required()
        }),
        failAction: (_request, _h, err) => {
          throw Boom.notFound('Image not found', err)
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/guidance-documents',
    handler: listController.getGuidanceDocuments
  },
  {
    method: 'GET',
    path: '/guidance-documents/{documentId}/view',
    handler: viewerController.getGuidanceViewerIndex
  },
  {
    method: 'GET',
    path: '/guidance-documents/{documentId}/sections/{sectionNumber}',
    handler: viewerController.getGuidanceViewerSection,
    options: {
      validate: {
        params: sectionParams,
        failAction: sectionNotFound
      }
    }
  },
  {
    method: 'GET',
    path: '/guidance-documents/{documentId}/sections/{sectionNumber}/edit',
    handler: editController.getGuidanceSectionEdit,
    options: {
      validate: {
        params: sectionParams,
        failAction: sectionNotFound
      }
    }
  },
  {
    method: 'POST',
    path: '/guidance-documents/{documentId}/sections/{sectionNumber}/edit',
    handler: editController.postGuidanceSectionEdit,
    options: {
      validate: {
        params: sectionParams,
        payload: editPayload,
        failAction: editController.guidanceSectionEditFailAction
      }
    }
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
