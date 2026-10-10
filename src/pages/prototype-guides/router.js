import Boom from '@hapi/boom'
import Joi from 'joi'

import * as prototypeGuidesController from './controller.js'

const LEGACY_PREFIX = '/admin/prototype-guides'

// A search is something a person typed: bounded well short of what the
// payload limit allows.
const MAX_QUERY_LENGTH = 500

const documentId = Joi.string().uuid()

// A guide reads whole, or one top-level section at a time.
const guideQuery = Joi.object({
  view: Joi.string().valid('whole', 'steps').default('whole'),
  step: Joi.number().integer().min(1).default(1)
})

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

// The page was an admin page under /admin/prototype-guides. Links to it are kept
// working by moving them, with their query, to the same place under
// /prototype-guides.
const movedPermanently = (request, h) => {
  const rest = request.params.rest ? `/${request.params.rest}` : ''
  const query = request.url.search ?? ''

  return h.redirect(`/prototype-guides${rest}${query}`).permanent()
}

const routes = [
  {
    method: 'GET',
    path: '/prototype-guides',
    handler: prototypeGuidesController.getPrototypeGuides,
    options: {
      validate: {
        query: Joi.object({
          q: Joi.string().trim().allow('').max(MAX_QUERY_LENGTH).default(''),
          purged: Joi.number().integer().min(0),
          uploaded: Joi.boolean()
        })
      }
    }
  },
  {
    method: 'GET',
    path: '/prototype-guides/purge',
    handler: prototypeGuidesController.getPurgeConfirmation
  },
  {
    method: 'POST',
    path: '/prototype-guides/purge',
    handler: prototypeGuidesController.postPurge,
    options: {
      pre: [{ method: sameOriginOnly }]
    }
  },
  {
    method: 'POST',
    path: '/prototype-guides/upload',
    handler: prototypeGuidesController.postUpload
  },
  {
    method: 'GET',
    path: '/prototype-guides/upload',
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
    path: '/prototype-guides/{documentId}',
    handler: prototypeGuidesController.getPrototypeGuideView,
    options: {
      validate: {
        params: Joi.object({ documentId: documentId.required() }),
        query: guideQuery,
        failAction: prototypeGuideNotFound
      }
    }
  },
  {
    method: 'GET',
    path: '/prototype-guides/{documentId}/assets/{assetId}',
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
  },
  // The search index links each guide and section at the API's own paths
  // for them, so this app serves a page at the same paths.
  {
    method: 'GET',
    path: '/prototype/guides/{documentId}/content',
    handler: prototypeGuidesController.getPrototypeGuideView,
    options: {
      validate: {
        params: Joi.object({ documentId: documentId.required() }),
        query: guideQuery,
        failAction: prototypeGuideNotFound
      }
    }
  },
  {
    method: 'GET',
    path: '/prototype/guides/{documentId}/sections/{sectionNumber}',
    handler: prototypeGuidesController.getPrototypeGuideSectionView,
    options: {
      validate: {
        params: Joi.object({
          documentId: documentId.required(),
          sectionNumber: Joi.string().pattern(/^\d+(\.\d+)*$/).required()
        }),
        failAction: prototypeGuideNotFound
      }
    }
  },
  {
    method: 'GET',
    path: LEGACY_PREFIX,
    handler: movedPermanently
  },
  {
    method: 'GET',
    path: `${LEGACY_PREFIX}/{rest*}`,
    handler: movedPermanently
  }
]

const prototypeGuidesRouter = {
  plugin: {
    name: 'prototypeGuidesRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  prototypeGuidesRouter
}
