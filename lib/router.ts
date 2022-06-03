import * as express from 'express'

import sessionRouter from './routes/session';
import webauthnRouter from './routes/webauthn';

const router = express.Router();

router.use('/session', sessionRouter);
router.use('/webauthn', webauthnRouter);

export default router;
