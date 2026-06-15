import { homeRouter } from './home/router.js'
import { guidanceDocumentsRouter } from './guidance-documents/router.js'

const pageRouter = {
  plugin: {
    name: 'pageRouter',
    async register (server) {
      await server.register([
        homeRouter,
        guidanceDocumentsRouter
      ])
    }
  }
}

export {
  pageRouter
}
