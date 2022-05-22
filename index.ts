import 'dotenv/config'
import type Imap from 'imap'

const {
  NODE_ENV,
  RELAY_PARTY,
  RELAY_PARTY_ID,
  PUBLIC_URL,
  NODE_PORT,
  SESSION_STORE_NAME,
  SESSION_SECRET,
  NODEMAILER_GMAIL_USER,
  NODEMAILER_GMAIL_APPPASS,
  EMAIL_PASSWORD,
  EMAIL_USER,
  EMAIL_DOMAIN,
  EMAIL_IMAP_HOST,
  EMAIL_IMAP_PORT,
  EMAIL_SMTP_HOST,
  EMAIL_SMTP_PORT,
} = process.env

import createApp from './lib'

(async () => {
  const { server, app } = await createApp({
    relayParty: RELAY_PARTY,
    relayPartyId: RELAY_PARTY_ID,
    publicUrl: PUBLIC_URL,
    syncOptions: NODE_ENV === 'development' ? { force: true } : {},
    sessionStoreName: SESSION_STORE_NAME,
    sessionSecret: SESSION_SECRET,
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
  })

  server.listen(NODE_PORT, () => {
    console.log('Server started on port %s', NODE_PORT)
  })

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received: closing HTTP server')

    const imap = <Imap>app.get('emailin');
    imap.end()

    server.close(() => {
      console.info('HTTP server closed')
    })
  })
})()