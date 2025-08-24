'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addIndex('location_events', ['user_id', 'event_timestamp'], {
			name: 'idx_location_events_user_ts'
		});
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeIndex('location_events', 'idx_location_events_user_ts');
	}
};