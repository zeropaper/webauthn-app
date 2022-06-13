import 'dotenv/config'
import { Server } from 'http'
import type Imap from 'imap'
import { resolve } from 'path'
import { cwd } from 'process'

import testRouter from './test/testRouter'

import createApp from './lib'

const {
  RELAY_PARTY,
  RELAY_PARTY_ID,

  SESSION_STORE_NAME,
  SESSION_SECRET,

  EMAIL_PASSWORD,
  EMAIL_USER,
  EMAIL_IMAP_HOST,
  EMAIL_IMAP_PORT,
  EMAIL_SMTP_HOST,
  EMAIL_SMTP_PORT,

  DB_HOST,
  DB_USER,
  DB_PASS,

  NODE_PORT = 8080,
  NODE_ENV = 'development',
  PUBLIC_URL = `http://localhost:${NODE_PORT}`,
} = process.env;

(async () => {
  console.info('create app to listen on port', new Date(), NODE_PORT)
  const app = await createApp({
    // checks: ['cron'],
    publicDir: resolve(cwd(), 'public'),
    relayParty: RELAY_PARTY,
    relayPartyId: RELAY_PARTY_ID,
    publicUrl: PUBLIC_URL,
    syncOptions: RELAY_PARTY_ID === 'localhost' ? { force: true } : { alter: true },
    sessionStoreName: SESSION_STORE_NAME,
    sessionSecret: SESSION_SECRET,
    dbOptions: DB_PASS && DB_USER && DB_HOST ? {
      dialect: 'mariadb',
      database: 'webauthn',
      host: DB_HOST,
      username: DB_USER,
      password: DB_PASS,
    } : undefined,
    email: {
      user: EMAIL_USER,
      password: EMAIL_PASSWORD,
      imap: {
        host: EMAIL_IMAP_HOST,
        port: Number(EMAIL_IMAP_PORT),
        tls: true,
      },
      smtp: {
        host: EMAIL_SMTP_HOST,
        port: Number(EMAIL_SMTP_PORT),
        tls: true,
      },
    },
    routers: NODE_ENV === 'test' ? {
      '/test': testRouter,
    } : {}
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