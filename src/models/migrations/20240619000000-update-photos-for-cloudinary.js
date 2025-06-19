// 'use strict';

// /** @type {import('sequelize-cli').Migration} */
// module.exports = {
//   async up(queryInterface, Sequelize) {
//     // Add public_id column
//     await queryInterface.addColumn('photos', 'public_id', {
//       type: Sequelize.STRING(255),
//       allowNull: true,
//       after: 'file_path'
//     });

//     // Rename file_path to photo_url
//     await queryInterface.renameColumn('photos', 'file_path', 'photo_url');
//   },

//   async down(queryInterface, Sequelize) {
//     // Rename photo_url back to file_path
//     await queryInterface.renameColumn('photos', 'photo_url', 'file_path');

//     // Remove public_id column
//     await queryInterface.removeColumn('photos', 'public_id');
//   }
// };
