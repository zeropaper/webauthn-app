import { DataTypes, Model, InferAttributes, InferCreationAttributes, Sequelize } from 'sequelize';

import {
  AuthenticatorTransport,
} from '@simplewebauthn/typescript-types';

export interface AuthenticatorDeviceModel extends Model<InferAttributes<AuthenticatorDeviceModel>, InferCreationAttributes<AuthenticatorDeviceModel>> {
  userId: string;
  credentialPublicKey: Buffer;
  credentialID: Buffer;
  counter: number;
  transports?: AuthenticatorTransport[];
}

export const createModel = (sequelize: Sequelize) => sequelize.define<AuthenticatorDeviceModel>('AuthenticatorDevice', {
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  credentialPublicKey: {
    type: DataTypes.BLOB,
    allowNull: false,
  },
  credentialID: {
    type: DataTypes.BLOB,
    allowNull: false,
  },
  counter: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  transports: {
    type: DataTypes.STRING,
    get() {
      const str: string = (this.getDataValue('transports') || '') as any;
      return str.split(',') as AuthenticatorTransport[];
    },
    set(val: string[] | string) {
      const str = val.toString() as any;
      return this.setDataValue('transports', str);
    }
  }
});

export type AuthenticatorDevice = ReturnType<typeof createModel>;
