import Joi from 'joi'

import { statusCodes } from '../../constants/status-codes.js'

import * as confirmationController from './confirmation/controller.js'
import * as newCheckController from './new/controller.js'
import * as resultsController from './results/controller.js'
import * as statusController from './status/controller.js'

import { getCompleteDocuments } from '../../services/guidance-documents.js'
import { newCheckViewModel } from './new/view-model.js'

const routes = [
  {
    method: 'GET',
    path: '/publishing-checks',
    handler: statusController.getPublishingChecksStatus
  },
  {
    method: 'GET',
    path: '/publishing-checks/start',
    handler: newCheckController.getNewCheck
  },
  {
    method: 'POST',
    path: '/publishing-checks/start',
    handler: newCheckController.postNewCheck,
    options: {
      validate: {
        payload: Joi.object({ documentId: Joi.string().required() }),
        failAction: async (_request, h) => {
          const documents = await getCompleteDocuments()
          return h.view('publishing-checks/new/page.njk',
            newCheckViewModel({
              documents,
              errorMessage: 'Select a document to analyse',
              showSelectError: true
            }))
            .code(statusCodes.HTTP_STATUS_BAD_REQUEST)
            .takeover()
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/publishing-checks/confirmation',
    handler: confirmationController.getConfirmation
  },
  {
    method: 'GET',
    path: '/publishing-checks/{documentId}/results',
    handler: resultsController.getPublishingCheckResults
  }
]

const publishingChecksRouter = {
  plugin: {
    name: 'publishingChecksRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  publishingChecksRouter
}
