import Joi from 'joi'

import * as searchIndexController from './search-index/controller.js'
import * as rebuiltController from './search-index/rebuilt/controller.js'

const documentId = Joi.string().uuid()

// A rebuild discards the index before it builds, so an empty selection would
// empty the index. It is a mis-click, not an instruction: reject it.
const rebuildPayload = Joi.object({
  documentIds: Joi.alternatives()
    .try(documentId, Joi.array().items(documentId).min(1))
    .required()
})

// Admin pages are off the service navigation. The landing page links to the
// search index one, because rebuilding the index is a job somebody does, not
// a secret.
const routes = [
  {
    method: 'GET',
    path: '/admin/search-index',
    handler: searchIndexController.getSearchIndexAdmin
  },
  {
    method: 'POST',
    path: '/admin/search-index/rebuild',
    handler: searchIndexController.postSearchIndexRebuild,
    options: {
      validate: {
        payload: rebuildPayload,
        failAction: searchIndexController.rebuildFailAction
      }
    }
  },
  {
    method: 'GET',
    path: '/admin/search-index/rebuilt',
    handler: rebuiltController.getSearchIndexRebuilt,
    options: {
      validate: {
        query: Joi.object({
          purged: Joi.number().integer().min(0).default(0),
          failed: Joi.number().integer().min(0).default(0),
          took: Joi.number().min(0).default(0)
        })
      }
    }
  }
]

const adminRouter = {
  plugin: {
    name: 'adminRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  adminRouter
}
