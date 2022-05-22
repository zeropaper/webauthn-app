import type { Application } from "express";
import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize'
import type { UserModel } from "./models/User";

declare module 'express-session' {
  interface SessionData {
    userId: UserModel['id'];
  }
}

const SequelizeStore = connectSessionSequelize(session.Store);

function addSessionHandling(app: Application, options: {
  sessionSecret: string,
  sessionStoreName: string,
}) {
  const rpId = app.get('rpId');

  app.use(session({
    name: options.sessionStoreName,
    secret: options.sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: rpId !== 'localhost',
    store: new SequelizeStore({
      db: app.get('sequelize'),
    }),
    cookie: {
      secure: rpId !== 'localhost',
      path: '/',
      sameSite: 'strict',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    }
  }));
}

export default addSessionHandling;
