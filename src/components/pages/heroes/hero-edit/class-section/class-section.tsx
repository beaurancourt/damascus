import { Button, Select, Space } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { Characteristic } from '@/enums/characteristic';
import { ClassPanel } from '@/components/panels/elements/class-panel/class-panel';
import { Collections } from '@/utils/collections';
import { DoneBadge } from '@/components/controls/done-badge/done-badge';
import { Element } from '@/models/element';
import { EmptyMessage } from '@/components/pages/heroes/hero-edit/empty-message/empty-message';
import { FeatureData } from '@/models/feature';
import { Field } from '@/components/controls/field/field';
import { Format } from '@/utils/format';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroClass } from '@/models/class';
import { HeroLogic } from '@/logic/hero-logic';
import { Markdown } from '@/components/controls/markdown/markdown';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { StatsRow } from '@/components/panels/stats-row/stats-row';
import { SubClass } from '@/models/subclass';
import { Utils } from '@/utils/utils';
import { useState } from 'react';
import { useOptions } from '@/contexts/data-context';

import './class-section.scss';
import '@/components/features/feature-data/choice.scss';

const matchElement = (element: Element, searchTerm: string) => {
	const name = element.name.toLowerCase();
	const desc = element.description.toLowerCase();
	return searchTerm
		.toLowerCase()
		.split(' ')
		.some(token => name.includes(token) || desc.includes(token));
};

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	searchTerm: string;
	selectClass: (heroClass: HeroClass) => void;
	setLevel: (level: number) => void;
	selectPrimaryCharacteristics: (characteristics: Characteristic[]) => void;
	selectCharacteristics: (array: { characteristic: Characteristic, value: number }[]) => void;
	addSubclass: (subclass: SubClass) => void;
	removeSubclass: (subclassID: string) => void;
	setFeatureData: (featureID: string, data: FeatureData) => void;
}

export const ClassSection = (props: Props) => {
	const appOptions = useOptions();

	const classes = SourcebookLogic.getClasses(props.sourcebooks).map(Utils.copy).filter(c => matchElement(c, props.searchTerm));
	const options = classes.map(c => (
		<SelectablePanel key={c.id} onSelect={() => props.selectClass(c)}>
			<ClassPanel heroClass={c} sourcebooks={props.sourcebooks} />
		</SelectablePanel>
	));

	const heroClass = props.hero.class;

	const renderLevelBlock = (cls: HeroClass) => (
		<div>
			<HeaderText>Level</HeaderText>
			<NumberSpin
				value={cls.level}
				min={1}
				max={cls.featuresByLevel.length}
				onChange={value => props.setLevel(value)}
			/>
			<Field label='XP' value={props.hero.state.xp} />
			{
				HeroLogic.canLevelUp(props.hero, appOptions) ?
					<Button
						className='status-warning'
						onClick={() => props.setLevel(cls.level + 1)}
					>
						Advance to level {cls.level + 1}
					</Button>
					: null
			}
		</div>
	);

	const renderSubclassBlock = (cls: HeroClass) => {
		if (cls.subclassCount === 0) {
			return null;
		}

		const selectedIDs = cls.subclasses.filter(sc => sc.selected).map(sc => sc.id);
		const subclasses = Collections.sort(cls.subclasses, sc => sc.name);
		const isDone = selectedIDs.length >= cls.subclassCount;

		const toggleSubclass = (sc: SubClass) => {
			if (sc.selected) {
				props.removeSubclass(sc.id);
			} else if (selectedIDs.length < cls.subclassCount) {
				props.addSubclass(sc);
			}
		};

		const article = Format.startsWithVowel(cls.subclassName || 'subclass') ? 'an' : 'a';
		const subclassLabel = cls.subclassName || 'subclass';
		const prompt = cls.subclassCount === 1
			? `Choose ${article} ${subclassLabel}.`
			: `Choose ${cls.subclassCount} ${subclassLabel}s.`;

		return (
			<div>
				<HeaderText extra={isDone ? <DoneBadge /> : null}>{Format.capitalize(subclassLabel)}{cls.subclassCount > 1 ? 's' : ''}</HeaderText>
				<div className='ds-text'>{prompt}</div>
				{
					subclasses.map(sc => {
						const isSelected = !!sc.selected;
						const overLimit = !isSelected && selectedIDs.length >= cls.subclassCount;
						return (
							<div
								key={sc.id}
								className={`choice-option${isSelected ? ' selected' : ''}${overLimit ? ' disabled' : ''}`}
								onClick={() => !overLimit && toggleSubclass(sc)}
							>
								<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
								<div className='choice-option-body'>
									<div className='choice-option-name'>{sc.name}</div>
									<div className='choice-option-content'><Markdown text={sc.description} useSpan={true} /></div>
								</div>
							</div>
						);
					})
				}
			</div>
		);
	};

	return (
		<div className='hero-edit-content class-section'>
			{
				heroClass ?
					<div className='hero-edit-content-column selected single-column' id='class-selected'>
						{renderLevelBlock(heroClass)}
						<Characteristics
							heroClass={heroClass}
							selectPrimaryCharacteristics={props.selectPrimaryCharacteristics}
							selectCharacteristics={props.selectCharacteristics}
						/>
						{renderSubclassBlock(heroClass)}
						<ClassPanel
							heroClass={heroClass}
							hero={props.hero}
							sourcebooks={props.sourcebooks}
							mode={PanelMode.Full}
							setFeatureData={props.setFeatureData}
						/>
					</div>
					: null
			}
			{
				!heroClass && (options.length > 0) ?
					<div className='hero-edit-content-column grid' id='class-list'>
						{options}
					</div>
					: null
			}
			{
				!heroClass && (options.length === 0) ?
					<div className='hero-edit-content-column' id='class-list'>
						<EmptyMessage hero={props.hero} />
					</div>
					: null
			}
		</div>
	);
};

interface CharacteristicsProps {
	heroClass: HeroClass;
	selectPrimaryCharacteristics: (characteristics: Characteristic[]) => void;
	selectCharacteristics: (array: { characteristic: Characteristic, value: number }[]) => void;
}

const Characteristics = (props: CharacteristicsProps) => {
	const getArray = () => {
		let currentArray: number[] = [];

		if (props.heroClass.primaryCharacteristics.length > 0) {
			const str = props.heroClass.characteristics
				.filter(ch => !props.heroClass.primaryCharacteristics.includes(ch.characteristic))
				.map(ch => ch.value)
				.join(', ');
			currentArray = HeroLogic.getCharacteristicArrays(props.heroClass.primaryCharacteristics.length)
				.find(arr => Collections.getPermutations(arr).map(a => a.join(', ')).includes(str)) || [];
		}

		return currentArray;
	};

	const [ array, setArray ] = useState<number[]>(getArray);
	const [ values, setValues ] = useState<{ characteristic: Characteristic, value: number }[]>(props.heroClass.characteristics);

	const isDone = (array.length > 0) && (values.length > 0) && values.some(v => v.value !== 0);

	const getHeader = () => {
		return (
			<HeaderText
				extra={
					<>
						{isDone ? <DoneBadge /> : null}
						{
							(array.length > 0) || (props.heroClass.primaryCharacteristicsOptions.length > 1) ?
								<Button
									type='text'
									icon={<CloseOutlined />}
									onClick={() => {
										setArray([]);
										setValues([]);
										props.selectPrimaryCharacteristics([]);
										props.selectCharacteristics([]);
									}}
								/>
								: null
						}
					</>
				}
			>
				Characteristics
			</HeaderText>
		);
	};

	if ((props.heroClass.primaryCharacteristicsOptions.length > 1) && (props.heroClass.primaryCharacteristics.length === 0)) {
		return (
			<div>
				{getHeader()}
				<div className='ds-text'>
					Your class allows you to choose your primary characteristics.
				</div>
				<Select
					style={{ width: '100%' }}
					status='warning'
					placeholder='Select your primary characteristics'
					options={props.heroClass.primaryCharacteristicsOptions.map(a => ({ value: a.join(', '), array: a }))}
					optionRender={option => <div className='ds-text'>{option.data.value}</div>}
					value={props.heroClass.primaryCharacteristics && (props.heroClass.primaryCharacteristics.length > 0) ? props.heroClass.primaryCharacteristics.join(', ') : null}
					onChange={(_text, option) => {
						const data = option as { value: string, array: Characteristic[] };
						props.selectPrimaryCharacteristics(data.array);
					}}
				/>
			</div>
		);
	}

	if (array.length === 0) {
		return (
			<div>
				{getHeader()}
				<Space orientation='vertical' style={{ width: '100%' }}>
					<div className='ds-text'>
						You start with a 2 in <b>{props.heroClass.primaryCharacteristics.join(' and ')}</b>. Choose the set of values you'd like for your other characteristics.
					</div>
					{
						HeroLogic.getCharacteristicArrays(props.heroClass.primaryCharacteristics.length)
							.map((a, n) => (
								<Button key={n} block={true} onClick={() => setArray(a)}>
									{a.join(', ')}
								</Button>
							))
					}
				</Space>
			</div>
		);
	}

	if (values.length === 0) {
		return (
			<div>
				{getHeader()}
				<div className='ds-text'>
					Choose your characteristics.
				</div>
				{
					HeroLogic.calculateCharacteristicArrays(array, props.heroClass.primaryCharacteristics)
						.map((a, n1) => (
							<StatsRow
								key={n1}
								onClick={() => {
									setValues(a);
									props.selectCharacteristics(a);
								}}
							>
								{
									a.map(ch => (
										<Field
											key={ch.characteristic}
											orientation='vertical'
											label={ch.characteristic}
											value={ch.value}
										/>
									))
								}
							</StatsRow>
						))
				}
			</div>
		);
	}

	return (
		<div>
			{getHeader()}
			<StatsRow>
				{
					props.heroClass.characteristics.map(ch => (
						<Field
							key={ch.characteristic}
							orientation='vertical'
							label={ch.characteristic}
							value={ch.value}
						/>
					))
				}
			</StatsRow>
		</div>
	);
};
