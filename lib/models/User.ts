import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize } from 'sequelize'

export interface UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  id: CreationOptional<string>;
  currentChallenge: string;
  username: string;
  email: string;
  emailVerificationToken: string;
}

export const createModel = (sequelize: Sequelize) => sequelize.define<UserModel>('User', {
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

export type User = ReturnType<typeof createModel>