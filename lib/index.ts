import express from 'express'
import http from 'http'
import helmet from 'helmet'
import { Sequelize, Options as DBOptions, SyncOptions } from 'sequelize'

import makeModels from './models'
import router from './router'
import { resolve } from 'path'
import addSessionHandling from './session';
import addEmail from './email'

type CreateAppOptions = {
  relayParty: string,
  relayPartyId: string,
  publicUrl: string,
  sessionStoreName: string,
  sessionSecret: string,
  publicDir?: string,
  dbOptions?: DBOptions,
  syncOptions?: SyncOptions,
  // gmailUser?: string,
  // gmailAppPassword?: string,
  email: Parameters<typeof addEmail>[1],
}

async function createApp(options: CreateAppOptions): Promise<{
  server: http.Server;
  app: express.Application;
}> {
  try {
    // if (!options.dbOptions) console.warn('No database options provided, using default SQLite in memory database')
    const app = express()
    const server = http.createServer(app)

    const opts = options.dbOptions || `sqlite:${true ? resolve(__dirname, '../db.sqlite') : ':memory:'}`
    console.info('sequelize options', opts)
    // @ts-ignore
    const sequelize = new Sequelize(opts)
    app.set('sequelize', sequelize)

    app.set('rp', options.relayParty)
    app.set('rpId', options.relayPartyId)
    app.set('publicUrl', options.publicUrl)

    // app.use(helmet())
    app.use(express.json())

    app.use(express.static(options.publicDir || resolve(__dirname, '../public')));

    addSessionHandling(app, options)
    addEmail(app, options.email)

    makeModels(sequelize)

    app.use(router)

    await sequelize.sync(options.syncOptions)

    return {
      server,
      app
    };
  } catch (e) {
    console.info('createApp error', e)
    throw e
  }
}

export default createApp;
