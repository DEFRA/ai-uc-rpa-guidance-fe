import process from 'node:process'

import * as serverTools from './server/server.js'
import { createLogger } from './infra/logging/logger.js'

const server = await serverTools.createServer()

await serverTools.startServer(server)

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
