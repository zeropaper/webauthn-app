import { resolve } from 'path'
import { cwd } from 'process'
import type { CreateAppOptions } from "../lib"

export function sqliteConfig(name = 'test') {
  return `sqlite:${name ? resolve(__dirname, `../${name}.sqlite`) : ':memory:'}`
}

const options: CreateAppOptions = {
  checks: ['cron'],
  dbOptions: sqliteConfig(),
  publicDir: resolve(cwd(), 'public'),
  relayParty: 'localhost',
  relayPartyId: 'localhost',
  publicUrl: `http://localhost:${process.env.NODE_PORT || 9000}/`,
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
