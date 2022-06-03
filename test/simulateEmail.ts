import { Application } from 'express';
import request from 'supertest';
import { Models } from '../lib/models';
import waitFor from "./waitFor";

export default async function simulateEmail(app: Application, sessionId: string, from = 'userA') {
  const sequelize = app.get('sequelize');
  const User = <Models['User']>sequelize.model('User');
  const ImapMail = sequelize.model('ImapMail');
  const usersBefore = await User.count();
  await ImapMail.create({
    sessionId,
    from,
  });
  await request(app)
    .post('/webhook')
    .expect(204);
  await waitFor(async () => {
    return await User.count() >= usersBefore + 1;
  });
}
