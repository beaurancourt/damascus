import { Select, Space } from 'antd';
import { Feature, FeatureKitData } from '@/models/feature';
import { Collections } from '@/utils/collections';
import { Empty } from '@/components/controls/empty/empty';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Kit } from '@/models/kit';
import { KitPanel } from '@/components/panels/elements/kit-panel/kit-panel';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './choice.scss';

interface InfoProps {
	data: FeatureKitData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

export const InfoKit = (props: InfoProps) => {
	if (props.data.selected.length > 0) {
		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					props.data.selected.map(k => <KitPanel key={k.id} kit={k} sourcebooks={props.sourcebooks || []} />)
				}
			</Space>
		);
	}

	return (
		<div className='ds-text'>Choose {props.data.count > 1 ? props.data.count : 'a'} {props.data.types.join(', ')} {props.data.count > 1 ? 'kits' : 'kit'}.</div>
	);
};

interface EditProps {
	data: FeatureKitData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureKitData) => void;
}

export const EditKit = (props: EditProps) => {
	const [ data, setData ] = useState<FeatureKitData>(Utils.copy(props.data));

	const setKitTypes = (value: string[]) => {
		const copy = Utils.copy(data);
		copy.types = value;
		setData(copy);
		props.setData(copy);
	};

	const setCount = (value: number) => {
		const copy = Utils.copy(data);
		copy.count = value;
		setData(copy);
		props.setData(copy);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<HeaderText>Types</HeaderText>
			<Select
				style={{ width: '100%' }}
				status={data.types.length === 0 ? 'warning' : ''}
				placeholder='Kit types'
				mode='tags'
				allowClear={true}
				options={Collections.sort(Collections.distinct(SourcebookLogic.getKits(props.sourcebooks).map(k => k.type), x => x), x => x).map(type => ({ value: type, label: !type ? 'Standard' : type }))}
				optionRender={option => <div className='ds-text'>{option.data.label}</div>}
				value={data.types}
				onChange={setKitTypes}
			/>
			<HeaderText>Count</HeaderText>
			<NumberSpin min={1} value={data.count} onChange={setCount} />
		</Space>
	);
};

interface ConfigProps {
	data: FeatureKitData;
	feature: Feature;
	hero: Hero;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureKitData) => void;
}

export const ConfigKit = (props: ConfigProps) => {
	const otherKitIDs = HeroLogic.getKits(props.hero)
		.filter(k => !props.data.selected.some(s => s.id === k.id))
		.map(k => k.id);

	const selectedIDs = props.data.selected.map(k => k.id);
	const count = props.data.count;
	const isSingle = count === 1;

	const kitTypes = props.data.types.length > 0 ? props.data.types : [ '' ];
	const allKits = Collections.sort(
		SourcebookLogic.getKits(props.sourcebooks).filter(k => kitTypes.includes(k.type)),
		k => k.name
	);

	const toggleKit = (kit: Kit) => {
		const isSelected = selectedIDs.includes(kit.id);
		const dataCopy = Utils.copy(props.data);
		if (isSelected) {
			dataCopy.selected = dataCopy.selected.filter(k => k.id !== kit.id);
		} else if (isSingle) {
			dataCopy.selected = [ Utils.copy(kit) ];
		} else if (selectedIDs.length < count) {
			dataCopy.selected.push(Utils.copy(kit));
		} else {
			return;
		}
		props.setData(dataCopy);
	};

	if (allKits.length === 0) {
		return <Empty text='There are no options to choose for this feature.' />;
	}

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				{count === 1 ? 'Choose 1 kit.' : `Choose ${count} kits.`}
			</div>
			{
				allKits.map(kit => {
					const isSelected = selectedIDs.includes(kit.id);
					const alreadyTaken = !isSelected && otherKitIDs.includes(kit.id);
					// Once at limit, gray every unselected option — even single-pick
					// choices. To swap, the player deselects their current pick first.
					const overLimit = !isSelected && !alreadyTaken && selectedIDs.length >= count;
					const disabled = alreadyTaken || overLimit;
					return (
						<div
							key={kit.id}
							className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
							onClick={() => !disabled && toggleKit(kit)}
							title={alreadyTaken ? 'You already have this kit' : undefined}
						>
							<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
							<div className='choice-option-body'>
								<KitPanel kit={kit} hero={props.hero} sourcebooks={props.sourcebooks} mode={PanelMode.Full} />
							</div>
						</div>
					);
				})
			}
		</Space>
	);
};
