import { Sequelize } from 'sequelize';

import config from './index.js';

const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  host: config.db.host,
  dialect: 'mysql',
  logging: false
});
export default sequelize;
