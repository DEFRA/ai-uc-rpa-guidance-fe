import { homeRouter } from './home/router.js'
import { guidanceDocumentsRouter } from './guidance-documents/router.js'
import { publishingChecksRouter } from './publishing-checks/router.js'
import { contentReviewRouter } from './content-review/router.js'

const pageRouter = {
  plugin: {
    name: 'pageRouter',
    async register (server) {
      await server.register([
        homeRouter,
        guidanceDocumentsRouter,
        publishingChecksRouter,
        contentReviewRouter
      ])
    }
  }
}

export {
  pageRouter
}
