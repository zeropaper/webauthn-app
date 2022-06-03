import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize, HasMany } from 'sequelize'

export interface UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  email: string;
  id: CreationOptional<string>;
  currentChallenge: CreationOptional<string>;
}

export const createModel = (sequelize: Sequelize) => sequelize.define<UserModel>('User', {
  id: {
    allowNull: false,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  currentChallenge: {
    type: DataTypes.STRING,
    allowNull: true,
  },
})

export type User = ReturnType<typeof createModel>