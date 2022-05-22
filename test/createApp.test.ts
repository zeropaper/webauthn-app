import createApp from '../lib';

describe('createApp', () => {
  it('creates an express app', async () => {
    await expect(createApp({
      relayParty: 'test relay party',
      relayPartyId: 'testrelayparty',
      publicUrl: 'http://localhost:9090',
    })).resolves.toBeTruthy();
  });
})