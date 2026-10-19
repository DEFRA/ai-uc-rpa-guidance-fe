import Joi from 'joi'

import * as confirmationController from './confirmation/controller.js'
import * as startController from './start/controller.js'
import * as statusController from './status/controller.js'

const routes = [
  {
    method: 'GET',
    path: '/proof-of-concept/quality-checks',
    handler: statusController.getQualityChecksStatus
  },
  {
    method: 'GET',
    path: '/proof-of-concept/quality-checks/start',
    handler: startController.getStartQualityCheck
  },
  {
    method: 'POST',
    path: '/proof-of-concept/quality-checks/start',
    handler: startController.postStartQualityCheck,
    options: {
      validate: {
        payload: Joi.object({ documentId: Joi.string().required() }),
        failAction: startController.noGuideSelected
      }
    }
  },
  {
    method: 'GET',
    path: '/proof-of-concept/quality-checks/confirmation',
    handler: confirmationController.getConfirmation
  }
]

const qualityChecksRouter = {
  plugin: {
    name: 'qualityChecksRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  qualityChecksRouter
}
