import * as resultsController from './results/controller.js'

const routes = [
  {
    method: 'GET',
    path: '/publishing-checks/{id}',
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
