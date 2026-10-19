import { homeRouter } from './home/router.js'
import { guidanceDocumentsRouter } from './guidance-documents/router.js'
import { publishingChecksRouter } from './publishing-checks/router.js'
import { contentReviewRouter } from './content-review/router.js'
import { adminRouter } from './admin/router.js'
import { prototypeGuidesRouter } from './prototype-guides/router.js'
import { qualityChecksRouter } from './proof-of-concept/quality-checks/router.js'

const pageRouter = {
  plugin: {
    name: 'pageRouter',
    async register (server) {
      await server.register([
        homeRouter,
        guidanceDocumentsRouter,
        publishingChecksRouter,
        contentReviewRouter,
        adminRouter,
        prototypeGuidesRouter,
        qualityChecksRouter
      ])
    }
  }
}

export {
  pageRouter
}
