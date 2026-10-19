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
