import express, { Application } from 'express'
import http from 'http'
import helmet from 'helmet'
import cors from 'cors'
import { Sequelize, Options as DBOptions, SyncOptions } from 'sequelize'

import makeModels, { Instances, Models } from './models'
import router from './router'
import { resolve } from 'path'
import addSessionHandling from './session';
import addEmail from './email'
import addSockets, { emitToSessionSockets, IO } from './socket'
import logger from './logger'
import { processInbox } from './email/imap'
import { Store } from 'express-session'

export type CreateAppOptions = {
  checks?: ['cron' | 'interval', any?];
  relayParty: string;
  relayPartyId: string;
  publicUrl: string;
  sessionStoreName: string;
  sessionSecret: string;
  publicDir?: string;
  dbOptions?: DBOptions | string;
  syncOptions?: SyncOptions;
  email: Parameters<typeof addEmail>[1];
  socketIo?: Parameters<typeof addSockets>[2];
  routers?: { [route: string]: express.Router }
}

let counter = 0;
function makeOnMailCheckInterval(app: Application) {
  if (!app.get('imap')) return () => { };
  const sequelize: Sequelize = app.get('sequelize');
  const ImapMail = <Models['ImapMail']>sequelize.model('ImapMail')
  async function onInterval() {
    try {
      const mailSummaries = await processInbox(app, {})
      await ImapMail.bulkCreate(mailSummaries, {
        updateOnDuplicate: ['from', 'sessionId']
      });
      // console.info('[%s] found %s incoming mails', counter, mails.length)
    } catch (err) {
      console.error('[%s] onInterval error', counter, err.stack)
    }
  }
  return onInterval;
}

function makeOnSessionBindingInterval(app: Application) {
  const sequelize: Sequelize = app.get('sequelize');
  // const Session = <Models['Session']>sequelize.model('Session');
  const sessionStore = <Store>app.get('sessionStore');
  const ImapMail = <Models['ImapMail']>sequelize.model('ImapMail');
  const User = <Models['User']>sequelize.model('User');
  async function onInterval() {
    // const sessions = await Session.findAll({});
    const sessions: {
      [sid: string]: Instances['Session'],
    } = await new Promise((resolve, reject) => (sessionStore?.all ? sessionStore.all((err, data) => {
      if (err) return reject(err)
      resolve(data)
    }) : reject(new Error('sessionStore.all(cb) is not defined'))));

    // const mails = await ImapMail.findAll({});
    const toDestroy: Instances['ImapMail'][] = [];

    await Promise.all(Object.keys(sessions).map(async (sid) => {
      const session = sessions[sid];
      const data = JSON.parse(session.getDataValue('data'));
      if (data.userId) return;
      // const sessionMails = mails.filter((m) => m.sessionId === session.getDataValue('sid'));
      const sessionMails = await ImapMail.findAll({
        where: {
          sessionId: sid,
        }
      });
      // console.info('[%s] found %s mail summaries for session %s', counter, sessionMails.length, sid);
      if (!sessionMails.length) return;
      toDestroy.push(...sessionMails);

      const sessionMail = sessionMails[0];
      const [user] = await User.findOrCreate({
        where: {
          email: sessionMail.from,
        },
        defaults: {
          email: sessionMail.from,
        }
      });

      // console.info('[%s] user %s', counter, user.getDataValue('id'))

      const newData = {
        // socketIds: [],
        ...data,
        userId: user.getDataValue('id'),
      };
      session.setDataValue('data', JSON.stringify(newData));
      await session.save();

      // console.info('[%s] update %s data', counter, session.getDataValue('sid'), newData.socketIds)
      emitToSessionSockets(app.get('io'), newData.socketIds || [], 'sessionSocketsChange', {
        ...newData,
        sessionId: sid,
        started: undefined,
        cookie: undefined,
      }, (err: any) => {
        if (err) {
          console.error('emitToSessionSockets error for %s user', newData.userId, newData.socketIds, err);
          return;
        }
        // console.info('[%s] --- sent to user %s, sockets %s', counter, newData.userId, newData.socketIds?.join('\n'))
      })
    }));

    await Promise.all(toDestroy.map((m) => m.destroy()));
  }
  return onInterval;
}

async function createApp(options: CreateAppOptions): Promise<express.Application> {
  try {
    const app = express();
    const server = http.createServer(app);

    const opts = options.dbOptions || `sqlite:${true ? resolve(__dirname, '../db.sqlite') : ':memory:'}`;
    const sequelize = typeof opts === 'string'
      ? new Sequelize(opts as string, { logging: false })
      : new Sequelize({
        ...opts as object,
        logging: false,
      });
    app.set('sequelize', sequelize);

    app.set('rp', options.relayParty);
    app.set('rpId', options.relayPartyId);
    app.set('publicUrl', options.publicUrl);

    if (process.env.NODE_ENV !== 'test') app.use(helmet());
    app.use(cors({
      origin: true,
      credentials: true,
    }));
    app.use(express.json());
    app.use(logger);

    app.use(express.static(options.publicDir || resolve(__dirname, '../public')));

    await addSessionHandling(app, options)
    await addSockets(app, server, options?.socketIo)

    await addEmail(app, options.email)

    await makeModels(sequelize)

    app.use(router)
    Object.keys(options.routers || {}).forEach((route) => {
      app.use(route, options.routers[route]);
    });

    await sequelize.sync(options.syncOptions)

    const onMailCheckInterval = makeOnMailCheckInterval(app)
    const onSessionBindingInterval = makeOnSessionBindingInterval(app)
    if (options.checks?.[0] === 'cron') {
      app.post('/webhook', (req, res) => {
        counter += 1
        console.info('[%s] webhook', counter)
        // don't wait for the promise to resolve
        onMailCheckInterval()
        onSessionBindingInterval()
        res.status(204).end();
      });
    } else {
      setInterval(() => {
        counter += 1
        console.info('[%s] interval', counter)
        onMailCheckInterval()
        onSessionBindingInterval()
      }, 1000);
    }

    app.set('server', server)
    return app;
  } catch (e) {
    // console.info('createApp error', e)
    throw e
  }
}

export default createApp;
