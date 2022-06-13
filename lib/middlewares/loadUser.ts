import * as express from 'express';
import type { Models } from '../models'

const loadUser: express.RequestHandler = async function (req, res, next) {
  const User = <Models['User']>req.app.get('sequelize').model('User');
  try {
    if (!req.session.userId) return next();
    const user = await User.findByPk(req.session.userId);
    res.locals.user = user;
    req.session.userId = res.locals.user?.id;
    next()
  } catch (err) {
    next(err)
  }
}
export default loadUser;
