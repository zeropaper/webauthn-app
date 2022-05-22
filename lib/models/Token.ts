import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize } from 'sequelize'

export interface TokenModel extends Model<InferAttributes<TokenModel>, InferCreationAttributes<TokenModel>> {
  id: CreationOptional<string>;
  type: 'session' | 'user';
  identifier: string;
}

export const createModel = (sequelize: Sequelize) => sequelize.define<TokenModel>('Token', {
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

export type Token = ReturnType<typeof createModel>