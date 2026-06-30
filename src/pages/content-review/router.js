import Joi from 'joi'

import { statusCodes } from '../../constants/status-codes.js'

import * as confirmationController from './confirmation/controller.js'
import * as resultsController from './results/controller.js'
import * as startController from './start/controller.js'
import * as statusController from './status/controller.js'

import { getCompleteDocuments } from '../../services/guidance-documents.js'
import { startReviewViewModel } from './start/view-model.js'

const routes = [
  {
    method: 'GET',
    path: '/content-review',
    handler: statusController.getContentReviewStatus
  },
  {
    method: 'GET',
    path: '/content-review/start',
    handler: startController.getStartReview
  },
  {
    method: 'POST',
    path: '/content-review/start',
    handler: startController.postStartReview,
    options: {
      validate: {
        payload: Joi.object({ documentId: Joi.string().required() }),
        failAction: async (_request, h) => {
          const documents = await getCompleteDocuments()
          return h.view('content-review/start/page.njk',
            startReviewViewModel({
              documents,
              errorMessage: 'Select a document to review',
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
    path: '/content-review/confirmation',
    handler: confirmationController.getConfirmation
  },
  {
    method: 'GET',
    path: '/content-review/{documentId}/results',
    handler: resultsController.getContentReviewResults
  }
]

const contentReviewRouter = {
  plugin: {
    name: 'contentReviewRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  contentReviewRouter
}
