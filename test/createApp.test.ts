import { Application } from 'express';
import createApp from '../lib';
import testOptions from './testconfig';
import request from 'supertest';
import simulateEmail from './simulateEmail';
import { Models } from '../lib/models';

jest.mock('../lib/email/imap');

describe('createApp', () => {
  let app: Application;
  let agentA: ReturnType<typeof request.agent>;
  let agentB: ReturnType<typeof request.agent>;
  it('requires options', async () => {
    expect.assertions(1);
    try {
      // @ts-ignore
      await createApp();
    } catch (err) {
      expect(err.message).toMatch(/dbOptions/);
    }
  });

  it('creates an application', async () => {
    expect.assertions(1);
    app = await createApp(testOptions);
    expect(app).toHaveProperty('listen');
    agentA = request.agent(app);
    agentB = request.agent(app);
  });

  describe('/session endpoint', () => {
    it('returns 404 on initial GET', async () => {
      await agentA.get('/session').expect(404);
      await agentB.get('/session').expect(404);
    });

    it('handles the session creations', async () => {
      let sessionIdA: any;
      let sessionIdB: any;
      await agentA.post('/session')
        .expect(201)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId');
          sessionIdA = res.body.sessionId;
          expect(res.body).not.toHaveProperty('userId');
        });
      await agentA.get('/session')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId', sessionIdA);
          expect(res.body).not.toHaveProperty('userId');
        });
      await agentA.post('/session')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId', sessionIdA);
          expect(res.body).not.toHaveProperty('userId');
        });


      await agentB.post('/session')
        .expect(201)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId');
          expect(res.body).not.toHaveProperty('sessionId', sessionIdA);
          sessionIdB = res.body.sessionId;
          expect(res.body).not.toHaveProperty('userId');
        });
      await agentB.get('/session')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId', sessionIdB);
          expect(res.body).not.toHaveProperty('userId');
        });
      await agentB.post('/session')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId', sessionIdB);
          expect(res.body).not.toHaveProperty('userId');
        });
    });

    it('has a session ID that can be used to create a user', async () => {
      let sessionId: any;
      await agentA.post('/session')
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId');
          sessionId = res.body.sessionId;
        });

      expect(sessionId).toBeTruthy();
      await simulateEmail(app, sessionId);

      await agentA.get('/session')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('sessionId', sessionId);
          expect(res.body).toHaveProperty('userId');
        });
    });

    it('can be used to destroy a session', async () => {
      const sequelize = app.get('sequelize');
      const Session = <Models['Session']>sequelize.model('Session');
      const sessionsCount = await Session.count();

      await agentA.get('/session').expect(200);
      await agentA.delete('/session')
        .expect(204)
        .expect(async (response) => {
          // expect(response.headers).toHaveProperty('set-cookie');
          expect(await Session.count()).toBeLessThan(sessionsCount);
        });
      await agentA.get('/session').expect(404);
    });
  });
});
