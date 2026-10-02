import Boom from '@hapi/boom'
import Joi from 'joi'

import * as prototypeGuidesController from './prototype-guides/controller.js'
import * as searchIndexController from './search-index/controller.js'
import * as rebuiltController from './search-index/rebuilt/controller.js'

const documentId = Joi.string().uuid()

const prototypeGuideNotFound = (_request, _h, err) => {
  throw Boom.notFound('Prototype guide not found', err)
}

// Purging cannot be undone, so refuse a request another site made the
// browser send. Browsers say where a request came from in Sec-Fetch-Site, or
// in Origin if older; a request with neither did not come from a browser.
const sameOriginOnly = (request, h) => {
  const site = request.headers['sec-fetch-site']
  const origin = request.headers.origin

  const crossSite = site
    ? site !== 'same-origin'
    : Boolean(origin) && URL.parse(origin)?.host !== request.info.host

  if (crossSite) {
    throw Boom.forbidden('Cross-site request refused')
  }

  return h.continue
}

// A rebuild discards the index before it builds, so an empty selection would
// empty the index. It is a mis-click, not an instruction: reject it.
const rebuildPayload = Joi.object({
  documentIds: Joi.alternatives()
    .try(documentId, Joi.array().items(documentId).min(1))
    .required()
})

// Admin pages are off the service navigation. The landing page links to
// them, because rebuilding the index and checking what the prototype is
// served are jobs somebody does, not secrets.
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
  },
  {
    method: 'GET',
    path: '/admin/prototype-guides',
    handler: prototypeGuidesController.getPrototypeGuides,
    options: {
      validate: {
        query: Joi.object({
          purged: Joi.number().integer().min(0),
          uploaded: Joi.boolean()
        })
      }
    }
  },
  {
    method: 'GET',
    path: '/admin/prototype-guides/purge',
    handler: prototypeGuidesController.getPurgeConfirmation
  },
  {
    method: 'POST',
    path: '/admin/prototype-guides/purge',
    handler: prototypeGuidesController.postPurge,
    options: {
      pre: [{ method: sameOriginOnly }]
    }
  },
  {
    method: 'POST',
    path: '/admin/prototype-guides/upload',
    handler: prototypeGuidesController.postUpload
  },
  {
    method: 'GET',
    path: '/admin/prototype-guides/upload',
    handler: prototypeGuidesController.getUploadForm,
    options: {
      validate: {
        query: Joi.object({
          uploadId: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).required()
        }),
        failAction: (_request, _h, err) => {
          throw Boom.badRequest('uploadId is required', err)
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/admin/prototype-guides/{documentId}',
    handler: prototypeGuidesController.getPrototypeGuideView,
    options: {
      validate: {
        params: Joi.object({ documentId: documentId.required() }),
        failAction: prototypeGuideNotFound
      }
    }
  },
  {
    method: 'GET',
    path: '/admin/prototype-guides/{documentId}/assets/{assetId}',
    handler: prototypeGuidesController.getPrototypeGuideImage,
    options: {
      validate: {
        params: Joi.object({
          documentId: documentId.required(),
          assetId: Joi.string().pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).required()
        }),
        failAction: (_request, _h, err) => {
          throw Boom.notFound('Image not found', err)
        }
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
