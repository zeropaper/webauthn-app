import express from 'express';
import { Models } from '../lib/models';

const router = express.Router();

router.post('/simulate/incoming-mail', (req, res, next) => {
  const sequelize = req.app.get('sequelize');
  const ImapMail = sequelize.model('ImapMail');
  console.info('[test] simulate incoming mail');
  ImapMail.create(req.body)
    .then(() => res.status(201).end())
    .catch(next);
});

export default router;