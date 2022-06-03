import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize, HasMany } from 'sequelize'

export interface AuthenticatorDeviceModel extends Model<InferAttributes<AuthenticatorDeviceModel>, InferCreationAttributes<AuthenticatorDeviceModel>> {
  userId: string;
  credentialID: string;
  transports: string;
}

export const createModel = (sequelize: Sequelize) => sequelize.define<AuthenticatorDeviceModel>('AuthenticatorDevice', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  credentialID: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  transports: {
    type: DataTypes.STRING,
    get() {
      return (this.getDataValue('transports') || '').split(',')
    },
    set(val: string[] | string) {
      return this.setDataValue('transports', typeof val === 'string' ? val : val.join(','))
    }
  }
});

export type AuthenticatorDevice = ReturnType<typeof createModel>