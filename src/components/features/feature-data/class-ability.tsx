import { Select, Space } from 'antd';
import { Feature, FeatureClassAbilityData } from '@/models/feature';
import { Ability } from '@/models/ability';
import { AbilityPanel } from '@/components/panels/elements/ability-panel/ability-panel';
import { Collections } from '@/utils/collections';
import { Empty } from '@/components/controls/empty/empty';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroClass } from '@/models/class';
import { HeroLogic } from '@/logic/hero-logic';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './choice.scss';

interface InfoProps {
	data: FeatureClassAbilityData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

export const InfoClassAbility = (props: InfoProps) => {
	if (!props.hero) {
		return (
			<div className='ds-text'>
				Choose {props.data.count > 1 ? props.data.count : 'a'} {(props.data.cost === 'signature') || (props.data.cost === 0) ? 'signature' : `${props.data.cost}pt`} {props.data.count > 1 ? 'abilities' : 'ability'}.
			</div>
		);
	}

	let heroClass = props.hero.class || null;
	if (props.data.classID && props.sourcebooks) {
		// You get an ability from a different class
		heroClass = SourcebookLogic.getClasses(props.sourcebooks).find(c => c.id === props.data.classID) || null;
	}
	if (!heroClass) {
		return null;
	}

	const abilities = SourcebookLogic.getAbilitiesFromClass(heroClass, props.data.source.fromClassAbilities, props.data.source.fromSelectedSubclassAbilities, props.data.source.fromUnselectedSubclassAbilities, props.data.source.fromClassLevels, props.data.source.fromSelectedSubclassLevels, props.data.source.fromUnselectedSubclassLevels);

	if (props.data.selectedIDs.length > 0) {
		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					props.data.selectedIDs.map(id => {
						const ability = abilities.find(a => a.id === id) as Ability;
						if (!ability) {
							return null;
						}
						return (
							<AbilityPanel key={ability.id} ability={ability} mode={PanelMode.Full} />
						);
					})
				}
			</Space>
		);
	}

	return (
		<div className='ds-text'>
			Choose {props.data.count > 1 ? props.data.count : 'a'} {(props.data.cost === 'signature') || (props.data.cost === 0) ? 'signature' : `${props.data.cost}pt`} {props.data.count > 1 ? 'abilities' : 'ability'}{props.data.classID ? ` from the ${heroClass.name}` : ''}.
		</div>
	);
};

interface EditProps {
	data: FeatureClassAbilityData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureClassAbilityData) => void;
}

export const EditClassAbility = (props: EditProps) => {
	const [ data, setData ] = useState<FeatureClassAbilityData>(Utils.copy(props.data));

	const setAbilityCost = (value: number | 'signature') => {
		const copy = Utils.copy(data);
		copy.cost = value;
		setData(copy);
		props.setData(copy);
	};

	const setAbilityClassID = (value: string) => {
		const copy = Utils.copy(data);
		copy.classID = value === '' ? undefined : value;
		setData(copy);
		props.setData(copy);
	};

	const setClassAbilities = (value: boolean) => {
		const copy = Utils.copy(data);
		copy.source.fromClassAbilities = value;
		setData(copy);
		props.setData(copy);
	};

	const setSelectedSubclassAbilities = (value: boolean) => {
		const copy = Utils.copy(data);
		copy.source.fromSelectedSubclassAbilities = value;
		setData(copy);
		props.setData(copy);
	};

	const setUnselectedSubclassAbilities = (value: boolean) => {
		const copy = Utils.copy(data);
		copy.source.fromUnselectedSubclassAbilities = value;
		setData(copy);
		props.setData(copy);
	};

	const setClassLevels = (value: boolean) => {
		const copy = Utils.copy(data);
		copy.source.fromClassLevels = value;
		setData(copy);
		props.setData(copy);
	};

	const setSelectedSubclassLevels = (value: boolean) => {
		const copy = Utils.copy(data);
		copy.source.fromSelectedSubclassLevels = value;
		setData(copy);
		props.setData(copy);
	};

	const setUnselectedSubclassLevels = (value: boolean) => {
		const copy = Utils.copy(data);
		copy.source.fromUnselectedSubclassLevels = value;
		setData(copy);
		props.setData(copy);
	};

	const setCount = (value: number) => {
		const copy = Utils.copy(data);
		copy.count = value;
		setData(copy);
		props.setData(copy);
	};

	const setMinLevel = (value: number) => {
		const copy = Utils.copy(data);
		copy.minLevel = value;
		setData(copy);
		props.setData(copy);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<HeaderText>Ability Options</HeaderText>
			<Select
				style={{ width: '100%' }}
				options={[
					{ value: 'signature', label: 'Choose a signature ability' },
					{ value: 3, label: 'Choose a 3pt ability' },
					{ value: 5, label: 'Choose a 5pt ability' },
					{ value: 7, label: 'Choose a 7pt ability' },
					{ value: 9, label: 'Choose a 9pt ability' },
					{ value: 11, label: 'Choose a 11pt ability' },
					{ value: 1, label: 'Choose a 1pt ability' },
					{ value: 2, label: 'Choose a 2pt ability' },
					{ value: 4, label: 'Choose a 4pt ability' },
					{ value: 6, label: 'Choose a 6pt ability' },
					{ value: 8, label: 'Choose a 8pt ability' },
					{ value: 10, label: 'Choose a 10pt ability' },
					{ value: 12, label: 'Choose a 12pt ability' },
					{ value: 0, label: 'Choose an ability with no cost' }
				]}
				optionRender={option => <div className='ds-text'>{option.data.label}</div>}
				value={data.cost}
				onChange={setAbilityCost}
			/>
			<Select
				style={{ width: '100%' }}
				allowClear={!!data.classID}
				placeholder='Select class'
				options={[
					{ value: '', label: 'From your class' },
					...SourcebookLogic.getClasses(props.sourcebooks).map(o => ({ value: o.id, label: `From the ${o.name}` }))
				]}
				optionRender={option => <div className='ds-text'>{option.data.label}</div>}
				value={data.classID || ''}
				onChange={setAbilityClassID}
			/>
			<HeaderText>Ability Source</HeaderText>
			<Toggle label='Class abilities' value={data.source.fromClassAbilities} onChange={setClassAbilities} />
			<Toggle label='Abilities from selected subclasses' value={data.source.fromSelectedSubclassAbilities} onChange={setSelectedSubclassAbilities} />
			<Toggle label='Abilities from unselected subclasses' value={data.source.fromUnselectedSubclassAbilities} onChange={setUnselectedSubclassAbilities} />
			<Toggle label='Abilities from class levels' value={data.source.fromClassLevels} onChange={setClassLevels} />
			<Toggle label='Abilities from selected subclass levels' value={data.source.fromSelectedSubclassLevels} onChange={setSelectedSubclassLevels} />
			<Toggle label='Abilities from unselected subclass levels' value={data.source.fromUnselectedSubclassLevels} onChange={setUnselectedSubclassLevels} />
			<HeaderText>Count</HeaderText>
			<NumberSpin min={1} value={data.count} onChange={setCount} />
			<HeaderText>Minimum Level</HeaderText>
			<NumberSpin min={1} value={data.minLevel} onChange={setMinLevel} />
		</Space>
	);
};

interface ConfigProps {
	data: FeatureClassAbilityData;
	feature: Feature;
	hero: Hero;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureClassAbilityData) => void;
}

export const ConfigClassAbility = (props: ConfigProps) => {
	let heroClass: HeroClass | null = props.hero.class;
	if (props.data.classID) {
		// You get an ability from a different class
		heroClass = SourcebookLogic.getClasses(props.sourcebooks).find(c => c.id === props.data.classID) || null;
	}
	if (!heroClass) {
		return null;
	}

	// Abilities the hero already has from elsewhere (other ClassAbility features, signature progression, etc.)
	// Filter out the ones this picker has selected so they stay clickable in this picker.
	const otherAbilityIDs = HeroLogic.getAbilities(props.hero, props.sourcebooks, [])
		.map(a => a.ability.id)
		.filter(id => !props.data.selectedIDs.includes(id));

	const abilities = SourcebookLogic.getAbilitiesFromClass(
		heroClass,
		props.data.source.fromClassAbilities,
		props.data.source.fromSelectedSubclassAbilities,
		props.data.source.fromUnselectedSubclassAbilities,
		props.data.source.fromClassLevels,
		props.data.source.fromSelectedSubclassLevels,
		props.data.source.fromUnselectedSubclassLevels
	)
		.filter(a => a.cost === props.data.cost)
		.filter(a => a.minLevel <= props.data.minLevel);
	const allAbilities = Collections.sort(Collections.distinct(abilities, a => a.id), a => a.name);

	const selectedIDs = props.data.selectedIDs;
	const count = props.data.count;
	const isSingle = count === 1;

	const toggleAbility = (ability: Ability) => {
		const isSelected = selectedIDs.includes(ability.id);
		const dataCopy = Utils.copy(props.data);
		if (isSelected) {
			dataCopy.selectedIDs = dataCopy.selectedIDs.filter(id => id !== ability.id);
		} else if (isSingle) {
			dataCopy.selectedIDs = [ ability.id ];
		} else if (selectedIDs.length < count) {
			dataCopy.selectedIDs.push(ability.id);
		} else {
			return;
		}
		props.setData(dataCopy);
	};

	if (allAbilities.length === 0) {
		return <Empty text='There are no options to choose for this feature.' />;
	}

	const label = props.data.cost === 'signature' ? 'signature' : `${props.data.cost}pt`;

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				Choose {count > 1 ? count : 1} {label} {count > 1 ? 'abilities' : 'ability'}.
			</div>
			{
				allAbilities.map(ability => {
					const isSelected = selectedIDs.includes(ability.id);
					const alreadyTaken = !isSelected && otherAbilityIDs.includes(ability.id);
					// Once at limit, gray every unselected option — even single-pick
					// choices. To swap, the player deselects their current pick first.
					const overLimit = !isSelected && !alreadyTaken && selectedIDs.length >= count;
					const disabled = alreadyTaken || overLimit;
					return (
						<div
							key={ability.id}
							className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
							onClick={() => !disabled && toggleAbility(ability)}
							title={alreadyTaken ? 'You already have this ability' : undefined}
						>
							<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
							<div className='choice-option-body'>
								<AbilityPanel ability={ability} hero={props.hero} mode={PanelMode.Full} />
							</div>
						</div>
					);
				})
			}
		</Space>
	);
};
