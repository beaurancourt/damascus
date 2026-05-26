import { Button, Segmented, Space } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, PlusOutlined } from '@ant-design/icons';
import { AbilityPanel } from '@/components/panels/elements/ability-panel/ability-panel';
import { Feature, FeatureChoiceData } from '@/models/feature';
import { Collections } from '@/utils/collections';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { Empty } from '@/components/controls/empty/empty';
import { Expander } from '@/components/controls/expander/expander';
import { FactoryLogic } from '@/logic/factory-logic';
import { FeatureEditPanel } from '@/components/panels/edit/feature-edit/feature-edit-panel';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { InfoFeature } from '@/components/features/feature';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Markdown } from '@/components/controls/markdown/markdown';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './choice.scss';

interface InfoProps {
	data: FeatureChoiceData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

export const InfoChoice = (props: InfoProps) => {
	if (props.data.selected.length > 0) {
		return (
			<Space orientation='vertical' style={{ width: '100%', padding: '0 20px', borderLeft: '5px solid rgb(200 200 200)' }}>
				{props.data.selected.map(f => <FeaturePanel key={f.id} feature={f} mode={PanelMode.Full} />)}
			</Space>
		);
	}

	if (props.data.options.length === 0) {
		return null;
	}

	const showCosts = props.data.options.some(o => o.value > 1);
	return (
		<div>
			<div className='ds-text'>
				{
					showCosts ?
						`You have ${props.data.count} points to spend on the following options:`
						:
						`Choose ${props.data.count} of the following options:`
				}
			</div>
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					props.data.options.map(o => (
						<Expander key={o.feature.id} title={o.feature.name}>
							<FeaturePanel feature={o.feature} cost={showCosts ? o.value : undefined} mode={PanelMode.Full} />
						</Expander>
					))
				}
			</Space>
		</div>
	);
};

interface EditProps {
	data: FeatureChoiceData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureChoiceData) => void;
}

export const EditChoice = (props: EditProps) => {
	const [ data, setData ] = useState<FeatureChoiceData>(Utils.copy(props.data));

	const addChoice = (data: FeatureChoiceData) => {
		const copy = Utils.copy(data);
		copy.options.push({
			feature: FactoryLogic.feature.create({
				id: Utils.guid(),
				name: '',
				description: ''
			}),
			value: 1
		});
		setData(copy);
		props.setData(copy);
	};

	const moveChoice = (data: FeatureChoiceData, index: number, direction: 'up' | 'down') => {
		const copy = Utils.copy(data);
		copy.options = Collections.move(copy.options, index, direction);
		setData(copy);
		props.setData(copy);
	};

	const deleteChoice = (data: FeatureChoiceData, index: number) => {
		const copy = Utils.copy(data);
		copy.options.splice(index, 1);
		setData(copy);
		props.setData(copy);
	};

	const setChoiceFeature = (data: FeatureChoiceData, index: number, value: Feature) => {
		const copy = Utils.copy(data);
		copy.options[index].feature = value;
		setData(copy);
		props.setData(copy);
	};

	const setChoiceValue = (data: FeatureChoiceData, index: number, value: number) => {
		const copy = Utils.copy(data);
		copy.options[index].value = value;
		setData(copy);
		props.setData(copy);
	};

	const setChoiceCount = (value: number | 'ancestry') => {
		const copy = Utils.copy(data) as FeatureChoiceData;
		copy.count = value;
		setData(copy);
		props.setData(copy);
	};

	const setSelectAt = (value: 'build' | 'respite' | 'play') => {
		const copy = Utils.copy(data) as FeatureChoiceData;
		copy.selectAt = value;
		setData(copy);
		props.setData(copy);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<HeaderText
				extra={
					<Button type='text' icon={<PlusOutlined />} onClick={() => addChoice(data)} />
				}
			>
				Options
			</HeaderText>
			{
				data.options.map((option, n) => (
					<Expander
						key={option.feature.id}
						title={option.feature.name || 'Unnamed Feature'}
						extra={[
							<Button key='up' type='text' title='Move Up' icon={<CaretUpOutlined />} onClick={e => { e.stopPropagation(); moveChoice(data, n, 'up'); }} />,
							<Button key='down' type='text' title='Move Down' icon={<CaretDownOutlined />} onClick={e => { e.stopPropagation(); moveChoice(data, n, 'down'); }} />,
							<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteChoice(data, n); }} />
						]}
					>
						<Space orientation='vertical' style={{ width: '100%' }}>
							<FeatureEditPanel
								feature={option.feature}
								sourcebooks={props.sourcebooks}
								onChange={f => setChoiceFeature(data, n, f)}
							/>
							<NumberSpin min={1} value={option.value} onChange={value => setChoiceValue(data, n, value)} />
						</Space>
					</Expander>
				))
			}
			{
				data.options.length === 0 ?
					<Empty />
					: null
			}
			<HeaderText>Count</HeaderText>
			<Toggle label='Use ancestry points' value={data.count === 'ancestry'} onChange={value => setChoiceCount(value ? 'ancestry' : 3)} />
			{data.count !== 'ancestry' ? <NumberSpin min={1} value={data.count} onChange={setChoiceCount} /> : null}
			<HeaderText>Select</HeaderText>
			<Segmented
				block={true}
				options={[
					{ value: 'build', label: 'At build time' },
					{ value: 'respite', label: 'During a respite' },
					{ value: 'play', label: 'In play' }
				]}
				value={data.selectAt}
				onChange={setSelectAt}
			/>
		</Space>
	);
};

interface ConfigProps {
	data: FeatureChoiceData;
	feature: Feature;
	hero: Hero;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureChoiceData) => void;
}

// Render the option's full content: description + mechanical details.
// AbilityPanel handles Ability/MaliceAbility specifically (it provides name+mechanics+cost).
// Multiple containers (e.g. Devil's Wings) are unwrapped — render each sub-feature inline so
// there's no "Features" expander nested inside the row.
// Choice sub-features (e.g. Time Raider's Psionic Gift) render their sub-options as a flat
// preview list rather than collapsible expanders.
// For other types, render the description text alongside InfoFeature, which formats
// data-bearing features (DamageModifier, Speed, SaveThreshold) into readable text.
const renderOptionContent = (feature: Feature, hero: Hero, sourcebooks: Sourcebook[]) => {
	if ((feature.type === FeatureType.Ability) || (feature.type === FeatureType.MaliceAbility)) {
		return <AbilityPanel ability={feature.data.ability} hero={hero} mode={PanelMode.Full} />;
	}
	if (feature.type === FeatureType.Multiple) {
		return (
			<>
				{feature.data.features.map(sub => (
					<div key={sub.id}>{renderOptionContent(sub, hero, sourcebooks)}</div>
				))}
			</>
		);
	}
	if (feature.type === FeatureType.Choice) {
		const count = feature.data.count;
		return (
			<>
				{feature.description ? <Markdown text={feature.description} useSpan={true} /> : null}
				<div className='ds-text'>
					{count === 'ancestry' ? 'Sub-options:' : `Choose ${count} of the following:`}
				</div>
				{feature.data.options.map(o => (
					<div key={o.feature.id} className='choice-sub-option'>
						{hasMeaningfulName(o.feature) && !isAbilityFeature(o.feature)
							? <div className='choice-option-name'>{o.feature.name}</div>
							: null}
						{renderOptionContent(o.feature, hero, sourcebooks)}
					</div>
				))}
			</>
		);
	}
	return (
		<>
			{feature.description ? <Markdown text={feature.description} useSpan={true} /> : null}
			<InfoFeature feature={feature} hero={hero} sourcebooks={sourcebooks} />
		</>
	);
};

const isAbilityFeature = (feature: Feature) => (feature.type === FeatureType.Ability) || (feature.type === FeatureType.MaliceAbility);

// Suppress the feature.name when it matches the default-type label set by the factory
// (e.g. "Damage Modifier" for a DamageModifier feature with no custom name).
const GENERIC_NAMES = new Set([
	'Damage Modifier',
	'Speed',
	'Save Threshold',
	'Bonus',
	'Characteristic Bonus',
	'Skill',
	'Skill Choice',
	'Language',
	'Language Choice',
	'Movement Mode',
	'Size',
	'Proficiency',
	'Heroic Resource'
]);
const hasMeaningfulName = (feature: Feature) => !!feature.name && !GENERIC_NAMES.has(feature.name);

export const ConfigChoice = (props: ConfigProps) => {
	let allOptions = [ ...props.data.options ];
	if (allOptions.some(opt => opt.feature.type === FeatureType.AncestryFeatureChoice)) {
		allOptions = allOptions.filter(opt => opt.feature.type !== FeatureType.AncestryFeatureChoice);
		const additionalOptions = HeroLogic.getFormerAncestries(props.hero)
			.flatMap(a => a.features)
			.filter(f => f.type === FeatureType.Choice)
			.flatMap(f => f.data.options)
			.filter(opt => opt.feature.type !== FeatureType.AncestryFeatureChoice);
		allOptions.push(...additionalOptions);
	}
	allOptions = Collections.distinct(allOptions, opt => opt.feature.id);
	const sortedOptions = Collections.sort(allOptions, opt => opt.feature.name);

	const selectedIDs = props.data.selected.map(f => f.id);
	const pointsUsed = Collections.sum(selectedIDs, id => {
		const original = allOptions.find(o => o.feature.id === id);
		return original ? original.value : 0;
	});
	const pointsMax = props.data.count === 'ancestry' ? HeroLogic.getAncestryPoints(props.hero) : props.data.count;
	const pointsLeft = pointsMax - pointsUsed;

	const showCosts = props.data.options.some(opt => opt.value > 1);
	const isSingle = props.data.count === 1 && !showCosts;

	const toggleOption = (opt: { feature: Feature; value: number }) => {
		const dataCopy = Utils.copy(props.data);
		const isSelected = selectedIDs.includes(opt.feature.id);
		if (isSelected) {
			dataCopy.selected = dataCopy.selected.filter(x => x.id !== opt.feature.id);
		} else {
			if (isSingle) {
				dataCopy.selected = [ opt.feature ];
			} else {
				if (opt.value > pointsLeft) { return; }
				dataCopy.selected.push(opt.feature);
			}
		}
		props.setData(dataCopy);
	};

	if (sortedOptions.length === 0) {
		return <Empty text='There are no options to choose for this feature.' />;
	}

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				{
					showCosts
						? `You have ${pointsLeft} of ${pointsMax} point(s) left.`
						: `Choose ${props.data.count} option(s).`
				}
			</div>
			{
				sortedOptions.map(opt => {
					const isSelected = selectedIDs.includes(opt.feature.id);
					const overBudget = !isSelected && showCosts && opt.value > pointsLeft;
					const disabled = overBudget;
					// AbilityPanel renders the feature name itself; suppress the row-level name in that case.
					const showName = !isAbilityFeature(opt.feature) && hasMeaningfulName(opt.feature);
					return (
						<div
							key={opt.feature.id}
							className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
							onClick={() => !disabled && toggleOption(opt)}
						>
							<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
							<div className='choice-option-body'>
								{showName ? <div className='choice-option-name'>{opt.feature.name}</div> : null}
								<div className='choice-option-content'>{renderOptionContent(opt.feature, props.hero, props.sourcebooks)}</div>
							</div>
							{showCosts ? <div className='choice-option-cost'>{opt.value}</div> : null}
						</div>
					);
				})
			}
		</Space>
	);
};
