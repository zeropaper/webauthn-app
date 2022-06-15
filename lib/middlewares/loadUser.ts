import * as express from 'express';
import type { Models } from '../models'

const loadUser: express.RequestHandler = async function (req, res, next) {
  const sequelize = req.app.get('sequelize');
  const User = <Models['User']>sequelize.model('User');
  const AuthenticatorDevice = <Models['AuthenticatorDevice']>sequelize.model('AuthenticatorDevice');
  try {
    if (!req.session.userId) return next();
    const user = await User.findByPk(req.session.userId);
    res.locals.user = user;
    res.locals.authenticatorDevices = await AuthenticatorDevice.findAll({
      where: {
        userId: user.id,
      },
    });
    req.session.userId = res.locals.user?.id;
    next()
  } catch (err) {
    next(err)
  }
}
export default loadUser;
