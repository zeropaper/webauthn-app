import { resolve } from 'path'
import { cwd } from 'process'
import type { CreateAppOptions } from "../lib"

const options: CreateAppOptions = {
  checks: ['cron'],
  dbOptions: `sqlite:${true ? resolve(__dirname, '../test.sqlite') : ':memory:'}`,
  publicDir: resolve(cwd(), 'public'),
  relayParty: 'localhost',
  relayPartyId: 'localhost',
  publicUrl: 'http://localhost:8080',
  syncOptions: { force: true },
  sessionStoreName: 'SESSION_STORE_NAME',
  sessionSecret: 'SESSION_SECRET',
  email: {
    user: 'test@localhost.test',
    password: 'EMAIL_PASSWORD',
    imap: {
      host: 'EMAIL_IMAP_HOST',
      port: 6666,
      tls: true,
    },
    // smtp: {
    //   host: 'EMAIL_SMTP_HOST',
    //   port: Number(EMAIL_SMTP_PORT),
    //   tls: true,
    // },
  },
}

export default options;
