import * as express from 'express'

import sessionRouter from './routes/session';
import webauthnRouter from './routes/webauthn';

const router = express.Router();

router.use('/session', sessionRouter);
router.use('/webauthn', webauthnRouter);
router.get('/status', (req, res) => res.json({
  created: req.app.get('created'),
  relayParty: req.app.get('rp'),
  relayPartyId: req.app.get('rpId'),
  publicUrl: req.app.get('publicUrl'),
}));

export default router;
