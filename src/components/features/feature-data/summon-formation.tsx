import { Feature, FeatureSummonFormationData } from '@/models/feature';
import { Hero } from '@/models/hero';
import { Sourcebook } from '@/models/sourcebook';

// The feature carries no data of its own - its name and description are the
// whole of it, and the panels around this render those. Both halves exist so
// the feature type has the same shape as every other one.

interface InfoProps {
	data: FeatureSummonFormationData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const InfoSummonFormation = (_props: InfoProps) => {
	return null;
};

interface EditProps {
	data: FeatureSummonFormationData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureSummonFormationData) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const EditSummonFormation = (_props: EditProps) => {
	return null;
};
