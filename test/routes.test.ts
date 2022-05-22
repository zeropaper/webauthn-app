import createApp from '../lib'
import request from 'supertest'

describe('routes', () => {
  let app: Awaited<Promise<ReturnType<typeof createApp>>>
  beforeAll(async () => {
    app = await createApp({
      relayParty: 'test relay party',
      relayPartyId: 'testrelayparty',
      publicUrl: 'http://localhost:9090',
      sessionSecret: '',
      sessionStoreName: '',
      email: {
        imap: {},
        smtp: {},
      },
    })
  })

  describe('GET /registration/generate-options', () => {
    it('does', async () => {
      const response = await request(app)
        .get('/registration/generate-options')
      // .expect(200)

      console.info('/registration/generate-options response', response)
      // await expect()
      //   .resolves.toBeTruthy();
    });
  })
})