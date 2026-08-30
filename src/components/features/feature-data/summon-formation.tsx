import { Feature, FeatureSummonFormationData } from '@/models/feature';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Sourcebook } from '@/models/sourcebook';
import { Space } from 'antd';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

interface InfoProps {
	data: FeatureSummonFormationData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const InfoSummonFormation = (_props: InfoProps) => {
	// The trait bonuses are reflected in the description the FeaturePanel
	// already renders, so there's nothing extra to show here.
	return null;
};

interface EditProps {
	data: FeatureSummonFormationData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureSummonFormationData) => void;
}

export const EditSummonFormation = (props: EditProps) => {
	const [ data, setData ] = useState<FeatureSummonFormationData>(Utils.copy(props.data));

	const setStaminaBonus = (value: number) => {
		const copy = Utils.copy(data);
		copy.staminaBonus = value;
		setData(copy);
		props.setData(copy);
	};

	const setStabilityBonus = (value: number) => {
		const copy = Utils.copy(data);
		copy.stabilityBonus = value;
		setData(copy);
		props.setData(copy);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<HeaderText>Minion Stamina Bonus</HeaderText>
			<NumberSpin value={data.staminaBonus || 0} onChange={setStaminaBonus} />
			<HeaderText>Minion Stability Bonus</HeaderText>
			<NumberSpin value={data.stabilityBonus || 0} onChange={setStabilityBonus} />
		</Space>
	);
};
