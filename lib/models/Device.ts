import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize } from 'sequelize'

interface DeviceModel extends Model<InferAttributes<DeviceModel>, InferCreationAttributes<DeviceModel>> {
  credentialPublicKey: string
  credentialID: string
  counter: number
  transports: string
}

export const createModel = (sequelize: Sequelize) => sequelize.define<DeviceModel>('Device', {
  credentialPublicKey: {
    type: DataTypes.TEXT,
  },
  credentialID: {
    type: DataTypes.STRING,
  },
  counter: {
    type: DataTypes.NUMBER,
  },
  transports: {
    type: DataTypes.STRING,
    set(strArr: string[]) {
      return strArr.join(',')
    },
    get() {
      return (this.getDataValue('transports') || '').split(',')
    }
  }
}, {})

export type Device = ReturnType<typeof createModel>