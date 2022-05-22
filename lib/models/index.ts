import { Model, ModelDefined, Sequelize, DataTypes } from "sequelize";

type SessionDefined = ModelDefined<{ id: string;[k: string]: any }, any>

export class UserModel extends Model { }

export class TokenModel extends Model { }

export class AuthenticatorModel extends Model { }

function makeModels(sequelize: Sequelize) {
  const User = sequelize.define<UserModel>('User', {
    id: {
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    currentChallenge: {
      type: DataTypes.STRING,
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    emailVerificationToken: {
      type: DataTypes.STRING
    },
  })

  const Token = sequelize.define<TokenModel>('Token', {
    id: {
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM,
      values: ['session', 'user'],
    },
    identifier: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  })

  const Authenticator = sequelize.define<AuthenticatorModel>('Authenticator', {
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

  User.hasOne(Authenticator, { foreignKey: 'userId' })
  Authenticator.belongsTo(User, { foreignKey: 'userId' })

  return {
    User,
    Authenticator,
    Token,
    Session: <SessionDefined>sequelize.model('Session'),
  }
}

export default makeModels;

export type Models = ReturnType<typeof makeModels>

export type Instances = {
  User: ReturnType<Models['User']['create']>
  Authenticator: ReturnType<Models['Authenticator']['create']>
}