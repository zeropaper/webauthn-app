import { resolve } from 'path';
import { Sequelize } from 'sequelize';
import makeModels from '../lib/models'
import { User } from '../lib/models/User';
import { Device } from '../lib/models/Device';
import { Authenticator } from '../lib/models/Authenticator';

const sequelize = new Sequelize(`sqlite:${true ? resolve(__dirname, '../test.sqlite') : ':memory:'}`)
let models;

describe('models', () => {
  it('makes the models available in sequelize.models', async () => {
    expect(() => {
      models = makeModels(sequelize)
    }).not.toThrow()
    expect(models).toHaveProperty('User')
    expect(models).toHaveProperty('Device')
    expect(models).toHaveProperty('Authenticator')

    expect(sequelize).toHaveProperty('models.User')
    expect(sequelize).toHaveProperty('models.Device')
    expect(sequelize).toHaveProperty('models.Authenticator')
  })

  it('syncs', async () => {
    await expect((async () => {
      await sequelize.sync({ force: true })
    })()).resolves.toBeUndefined()
  })

  describe('User', () => {
    it('can be created', async () => {
      const User = <User>sequelize.models.User;
      const Device = <Device>sequelize.models.Device;
      expect(User).toBeDefined()
      let user;
      await expect((async () => {
        user = await User.create({
          // username: 'test',
        })
      })()).resolves.toBeUndefined()
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('addDevice')
    })
  });

  describe('Device', () => {
    it.skip('can be created', async () => {
      const Device = <Device>sequelize.models.Device;
      expect(Device).toBeDefined()
      let device;
      await expect((async () => {
        device = await Device.create({
        })
        device.setUser(await sequelize.models.User.create({
          username: 'testmore',
        }))
      })()).resolves.toBeUndefined()
      console.info(device)
    })
  });
});