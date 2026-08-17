import { Element } from '@/models/element';
import { Feature } from '@/models/feature';
import { ResourceGainFrequency } from '@/enums/resource-gain-frequency';

export interface Domain extends Element {
	featuresByLevel: {
		level: number;
		features: Feature[];
	}[];
	resourceGains: {
		resource: string;
		tag: string;
		trigger: string;
		value: string;
		frequency?: ResourceGainFrequency;
	}[];
	defaultFeatures: Feature[];
}
