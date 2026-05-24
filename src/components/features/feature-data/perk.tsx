import { Select, Space } from 'antd';
import { Feature, FeaturePerkData } from '@/models/feature';
import { Collections } from '@/utils/collections';
import { Empty } from '@/components/controls/empty/empty';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Markdown } from '@/components/controls/markdown/markdown';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Perk } from '@/models/perk';
import { PerkList } from '@/enums/perk-list';
import { PerkPanel } from '@/components/panels/elements/perk-panel/perk-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './choice.scss';

interface InfoProps {
	data: FeaturePerkData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

export const InfoPerk = (props: InfoProps) => {
	if (props.data.selected.length > 0) {
		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					props.data.selected.map(p => <PerkPanel key={p.id} perk={p} sourcebooks={props.sourcebooks || []} />)
				}
			</Space>
		);
	}

	return (
		<div className='ds-text'>Choose {props.data.count > 1 ? props.data.count : 'a'} {props.data.count > 1 ? 'perks' : 'perk'}.</div>
	);
};

interface EditProps {
	data: FeaturePerkData;
	sourcebooks: Sourcebook[];
	setData: (data: FeaturePerkData) => void;
}

export const EditPerk = (props: EditProps) => {
	const [ data, setData ] = useState<FeaturePerkData>(Utils.copy(props.data));

	const setPerkLists = (value: PerkList[]) => {
		const copy = Utils.copy(data);
		copy.lists = value;
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
			<HeaderText>Lists</HeaderText>
			<Select
				style={{ width: '100%' }}
				status={data.lists.length === 0 ? 'warning' : ''}
				placeholder='Perk lists'
				mode='multiple'
				allowClear={true}
				options={[ PerkList.Crafting, PerkList.Exploration, PerkList.Interpersonal, PerkList.Intrigue, PerkList.Lore, PerkList.Supernatural, PerkList.Special ].map(option => ({ value: option }))}
				optionRender={option => <div className='ds-text'>{option.data.value}</div>}
				value={data.lists}
				onChange={setPerkLists}
			/>
			<HeaderText>Count</HeaderText>
			<NumberSpin min={1} value={data.count} onChange={setCount} />
		</Space>
	);
};

interface ConfigProps {
	data: FeaturePerkData;
	feature: Feature;
	hero: Hero;
	sourcebooks: Sourcebook[];
	setData: (data: FeaturePerkData) => void;
}

export const ConfigPerk = (props: ConfigProps) => {
	const otherPerkIDs = HeroLogic.getFeatures(props.hero)
		.map(f => f.feature)
		.filter(f => f.type === FeatureType.Perk)
		.filter(f => f.id !== props.feature.id)
		.flatMap(f => f.data.selected)
		.map(p => p.id);

	const selectedIDs = props.data.selected.map(p => p.id);
	const count = props.data.count;
	const isSingle = count === 1;

	const allPerks = Collections.sort(
		SourcebookLogic.getPerks(props.sourcebooks).filter(p => props.data.lists.includes(p.list)),
		p => p.name
	);

	const togglePerk = (perk: Perk) => {
		const isSelected = selectedIDs.includes(perk.id);
		const dataCopy = Utils.copy(props.data);
		if (isSelected) {
			dataCopy.selected = dataCopy.selected.filter(p => p.id !== perk.id);
		} else if (isSingle) {
			dataCopy.selected = [ perk ];
		} else if (selectedIDs.length < count) {
			dataCopy.selected.push(perk);
		} else {
			return;
		}
		props.setData(dataCopy);
	};

	if (allPerks.length === 0) {
		return <Empty text='There are no options to choose for this feature.' />;
	}

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				{count === 1 ? 'Choose 1 perk.' : `Choose ${count} perks.`}
			</div>
			{
				allPerks.map(perk => {
					const isSelected = selectedIDs.includes(perk.id);
					const alreadyTaken = !isSelected && otherPerkIDs.includes(perk.id);
					const overLimit = !isSelected && !alreadyTaken && !isSingle && selectedIDs.length >= count;
					const disabled = alreadyTaken || overLimit;
					return (
						<div
							key={perk.id}
							className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
							onClick={() => !disabled && togglePerk(perk)}
							title={alreadyTaken ? 'You already have this perk' : undefined}
						>
							<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
							<div className='choice-option-body'>
								<div className='choice-option-name'>{perk.name}</div>
								<div className='choice-option-content'><Markdown text={perk.description} useSpan={true} /></div>
							</div>
						</div>
					);
				})
			}
		</Space>
	);
};
