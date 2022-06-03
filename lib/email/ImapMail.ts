import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize } from 'sequelize'

export interface ImapMailModel extends Model<InferAttributes<ImapMailModel>, InferCreationAttributes<ImapMailModel>> {
  id: CreationOptional<string>;
  from: string;
  sessionId: string;
}

export const createModel = (sequelize: Sequelize) => sequelize.define<ImapMailModel>('ImapMail', {
  id: {
    allowNull: false,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  from: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['from', 'sessionId'],
    },
  ]
})

export type ImapMail = ReturnType<typeof createModel>