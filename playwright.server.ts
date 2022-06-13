import { Server } from 'http'
import type Imap from 'imap'

import testRouter from './test/testRouter'
import testconfig, { sqliteConfig } from './test/testconfig'

import createApp from './lib'

const {
  NODE_PORT = 9000,
  PUBLIC_URL = `http://localhost:${NODE_PORT}`,
} = process.env;

(async () => {
  console.info('create app to listen on port', new Date(), NODE_PORT)
  const app = await createApp({
    ...testconfig,
    dbOptions: sqliteConfig('e2e'),
    email: {
      ...testconfig.email,
      imap: undefined,
    },
    routers: {
      '/test': testRouter,
    },
  })

  const server = <Server>app.get('server');
  server.listen(NODE_PORT, () => {
    console.log('Server started on %s', PUBLIC_URL)
  })

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received: closing HTTP server')

    const imap = <Imap>app.get('imap');
    imap.end()

    server.close(() => {
      console.info('HTTP server closed')
    })
  })
})()