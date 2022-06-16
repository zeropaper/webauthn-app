import { Application } from 'express';
import createApp from '../lib';
import testOptions from './testconfig';
import request from 'supertest';

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

  it('provides a /status endpoint', async () => {
    await request(app).get('/status').expect((response) => {
      expect(response).toHaveProperty('body.created');
      expect(response).toHaveProperty('body.relayParty', testOptions.relayParty);
      expect(response).toHaveProperty('body.relayPartyId', testOptions.relayPartyId);
      expect(response).toHaveProperty('body.publicUrl', testOptions.publicUrl);
    });
  })
});
