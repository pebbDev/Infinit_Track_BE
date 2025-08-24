// Optional FAHP seeder stub - store default TFN matrices to DB if table available
// This file is a placeholder and can be wired to sequelize seeders later.

import { WFA_PAIRWISE_TFN, DISC_PAIRWISE_TFN } from './config.fahp.js';

export function getDefaultFahpProfiles() {
	return [
		{
			profile: 'WFA_DEFAULT_V1',
			criteria: ['location_type', 'distance_factor', 'amenity_score'],
			pairwiseTFN: WFA_PAIRWISE_TFN
		},
		{
			profile: 'DISC_DEFAULT_V1',
			criteria: ['alpha_rate', 'lateness_severity', 'lateness_frequency', 'work_focus'],
			pairwiseTFN: DISC_PAIRWISE_TFN
		}
	];
}