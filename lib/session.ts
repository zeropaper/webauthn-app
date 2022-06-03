import type { Application } from "express";
import session, { Store } from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize'
import type { UserModel } from "./models/User";
import type { Models } from "./models";

declare module 'express-session' {
  interface SessionData {
    userId: UserModel['id'];
    mails?: any[];
    socketIds?: string[];
    started?: Date;
  }
}

const SequelizeStore = connectSessionSequelize(session.Store);

function addSessionHandling(app: Application, options: {
  sessionSecret: string,
  sessionStoreName: string,
}) {
  const rpId = app.get('rpId');
  const productionMode = rpId !== 'localhost';

  if (productionMode) app.set('trust proxy', 1)
  const store = new SequelizeStore({
    db: app.get('sequelize'),
  });

  if (!store.all) {
    const Session = <Models['Session']>app.get('sequelize').model('Session');
    store.all = (cb) => Session
      .findAll({})
      .then((results) => cb(null, results
        .reduce((obj, result) => {
          // @ts-ignore
          const { sid } = result.dataValues;
          obj[sid] = result;
          return obj;
        }, {})))

      // .then((results) => cb(null, results
      //   .reduce((obj, result) => {
      //     // @ts-ignore
      //     const { sid, data } = result.dataValues;
      //     obj[sid] = JSON.parse(data);
      //     return obj;
      //   }, {})))

      // .reduce(async (obj, result) => {
      //   // @ts-ignore
      //   obj[result.dataValues.sid] = await getSession(result.dataValues.sid);
      //   return obj;
      // }, {})))

      .catch(cb);
  }

  const sessionMiddleware = session({
    name: options.sessionStoreName,
    secret: options.sessionSecret,
    resave: false,
    saveUninitialized: false,
    // unset: 'destroy',
    // rolling: true,
    proxy: productionMode,
    store,
    cookie: {
      secure: productionMode,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    }
  });

  app.set('sessionStore', store);
  app.set('session', sessionMiddleware);
  app.use(sessionMiddleware);
}

export default addSessionHandling;
