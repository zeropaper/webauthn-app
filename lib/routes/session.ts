import * as express from 'express'
import { Session, SessionData } from 'express-session';

import loadUser from '../middlewares/loadUser';
// import { Models } from '../models';

const sessionRouter = express.Router()

function sessionJSON(session: Session & SessionData): object {
  return {
    started: session.started,
    userId: session.userId,
    sessionId: session.id,
    socketIds: session.socketIds,
  }
}

sessionRouter.post('/', (req, res, next) => {
  const code = req.session.started ? 200 : 201;
  req.session.started = req.session.started || new Date();
  req.session.save((err) => {
    if (err) return next(err);
    res.status(code).json(sessionJSON(req.session))
  })
})

sessionRouter.get('/', loadUser, (req, res, next) => {
  if (req.session.started) {
    return res.json(sessionJSON(req.session))
  }
  next()
})

sessionRouter.delete('/', async function (req, res, next) {
  // const Session = <Models['Session']>req.app.get('sequelize').model('Session');
  req.session.cookie.expires = new Date(0);
  req.session.destroy(async (err) => {
    if (err) return next(err);
    // const sessionDb = await Session.findByPk(req.sessionID);
    // await sessionDb?.destroy();
    res.status(204).end();
  });
})

export default sessionRouter;