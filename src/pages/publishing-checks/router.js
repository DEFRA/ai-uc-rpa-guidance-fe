import * as confirmationController from './confirmation/controller.js'
import * as newCheckController from './new/controller.js'
import * as resultsController from './results/controller.js'
import * as statusController from './status/controller.js'

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
    handler: newCheckController.postNewCheck
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
