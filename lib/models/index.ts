import { Model, ModelDefined, Sequelize, DataTypes } from "sequelize";
import { createModel as createUserModel } from "./User";
import { createModel as createImapMailModel } from "./ImapMail";
import { createModel as createAuthenticatorDeviceModel } from "./AuthenticatorDevice";

type SessionDefined = ModelDefined<{ id: string;[k: string]: any }, any>

function makeModels(sequelize: Sequelize) {
  const User = createUserModel(sequelize);
  const ImapMail = createImapMailModel(sequelize);
  const AuthenticatorDevice = createAuthenticatorDeviceModel(sequelize);

  // User.AuthenticatorDevice = User.hasMany(AuthenticatorDevice, {
  //   foreignKey: "userId",
  //   as: "authenticatorDevices",
  // });
  return {
    User,
    ImapMail,
    AuthenticatorDevice,
    Session: <SessionDefined>sequelize.model('Session'),
  }
}

export type Models = ReturnType<typeof makeModels>

export type Instances = {
  User: ReturnType<Models['User']['create']>;
  ImapMail: ReturnType<Models['ImapMail']['create']>;
  AuthenticatorDevice: ReturnType<Models['AuthenticatorDevice']['create']>;
  Session: ReturnType<Models['Session']['create']>;
}

export default makeModels;
