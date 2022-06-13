import { Application } from 'express';
import createApp from '../lib';
import testOptions, { sqliteConfig } from './testconfig';
import request from 'supertest';
import simulateEmail from './simulateEmail';
import { Models } from '../lib/models';

jest.mock('../lib/email/imap');

describe('createApp', () => {
  let app: Application;
  let agentA: ReturnType<typeof request.agent>;
  let sessionId: string;
  let registrationOptions: any;

  beforeAll(async () => {
    app = await createApp({
      ...testOptions,
      dbOptions: sqliteConfig('webauthn'),
    });
    agentA = request.agent(app);

    await agentA.post('/session')
      .expect((res) => {
        sessionId = res.body.sessionId;
      });

    await simulateEmail(app, sessionId, 'webauthnUser');
  });

  describe('/webauthn/registration', () => {
    it('returns registration options when request method is GET', async () => {
      await agentA.get('/webauthn/registration')
        .expect(200)
        .expect((response) => {
          registrationOptions = response.body;
        });
      // console.info('[webauthn/registration] %s', JSON.stringify(registrationOptions, null, 2));
      expect(registrationOptions).toHaveProperty('challenge');
      expect(registrationOptions).toHaveProperty('rp.name', 'localhost');
      expect(registrationOptions).toHaveProperty('rp.id', 'localhost');
      expect(registrationOptions).toHaveProperty('user.id');
      expect(registrationOptions).toHaveProperty('user.name', 'webauthnUser');
      expect(registrationOptions).toHaveProperty('user.displayName', 'webauthnUser');
    });
  });
});