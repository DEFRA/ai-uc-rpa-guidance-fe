import Boom from '@hapi/boom'
import Joi from 'joi'

import * as searchIndexController from './search-index/controller.js'
import * as rebuildsController from './search-index/rebuilds/controller.js'
import * as rebuiltController from './search-index/rebuilt/controller.js'

// Admin pages are off the service navigation. The landing page links to
// them, because rebuilding the index is a job somebody does, not a secret.
const rebuildParams = Joi.object({
  rebuildId: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).required()
})

const rebuildNotFound = (_request, _h, err) => {
  throw Boom.notFound('Rebuild not found', err)
}

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
        // A form with no button pressed sends no payload at all.
        payload: Joi.object({
          mode: Joi.string().valid('full', 'partial').default(searchIndexController.DEFAULT_MODE)
        }).allow(null)
      }
    }
  },
  {
    method: 'GET',
    path: '/admin/search-index/rebuilds/{rebuildId}',
    handler: rebuildsController.getSearchIndexRebuildProgress,
    options: {
      validate: {
        params: rebuildParams,
        failAction: rebuildNotFound
      }
    }
  },
  {
    method: 'GET',
    path: '/admin/search-index/rebuilds/{rebuildId}/status',
    handler: rebuildsController.getSearchIndexRebuildStatus,
    options: {
      validate: {
        params: rebuildParams,
        failAction: rebuildNotFound
      }
    }
  },
  {
    method: 'POST',
    path: '/admin/search-index/rebuilds/{rebuildId}/cancel-and-rebuild',
    handler: searchIndexController.postCancelAndRebuild,
    options: {
      validate: {
        params: rebuildParams,
        failAction: rebuildNotFound
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
          took: Joi.number().min(0).default(0),
          skipped: Joi.number().integer().min(0).default(0)
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
