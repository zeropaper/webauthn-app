import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize } from 'sequelize'

interface AuthenticatorModel extends Model<InferAttributes<AuthenticatorModel>, InferCreationAttributes<AuthenticatorModel>> {
  credentialId: CreationOptional<string>;
  credentialPublicKey: string;
  counter: number;
  transports: string;
}

export const createModel = (sequelize: Sequelize) => sequelize.define<AuthenticatorModel>('Authenticator', {
  // Encode to base64url then store as `TEXT`. Index this column
  credentialId: {
    type: DataTypes.TEXT,
  },
  // Store raw bytes as `BYTEA`/`BLOB`/etc...
  credentialPublicKey: {
    type: DataTypes.BLOB,
  },
  // Consider `BIGINT` since some authenticators return atomic timestamps as counters
  counter: {
    type: DataTypes.BIGINT,
  },
  // `VARCHAR(255)` and store string array as a CSV string
  // ['usb' | 'ble' | 'nfc' | 'internal']
  transports: {
    type: DataTypes.STRING,
  },
})

export type Authenticator = ReturnType<typeof createModel>