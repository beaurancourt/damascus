import { Feature, FeatureSkillChoiceData } from '@/models/feature';
import { Select, Space } from 'antd';
import { Collections } from '@/utils/collections';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { SkillList } from '@/enums/skill-list';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './choice.scss';

interface InfoProps {
	data: FeatureSkillChoiceData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

export const InfoSkillChoice = (props: InfoProps) => {
	if (props.data.selected.length > 0) {
		return (
			<Field label='Skill' value={props.data.selected.join(', ')} />
		);
	}

	const count = props.data.count || 1;

	let str;
	if (props.data.listOptions.length === 5) {
		str = (count > 1 ? `Choose ${count} skills.` : 'Choose a skill.');
	} else {
		const names = (Collections.sort(props.data.options, o => o) || []).concat((Collections.sort(props.data.listOptions, o => o) || []).map(l => `the ${l} list`)).join(', ');
		str = (count > 1 ? `Choose ${count} skills from ${names}.` : `Choose a skill from ${names}.`);
	}

	return (
		<div className='ds-text'>{str}</div>
	);
};

interface EditProps {
	data: FeatureSkillChoiceData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureSkillChoiceData) => void;
}

export const EditSkillChoice = (props: EditProps) => {
	const [ data, setData ] = useState<FeatureSkillChoiceData>(Utils.copy(props.data));

	const setSkillOptions = (value: string[]) => {
		const copy = Utils.copy(data);
		copy.options = value;
		setData(copy);
		props.setData(copy);
	};

	const setSkillListOptions = (value: SkillList[]) => {
		const copy = Utils.copy(data);
		copy.listOptions = value;
		setData(copy);
		props.setData(copy);
	};

	const setCount = (value: number) => {
		const copy = Utils.copy(data);
		copy.count = value;
		setData(copy);
		props.setData(copy);
	};

	const setSkillSelected = (value: string[]) => {
		const copy = Utils.copy(data);
		copy.selected = value;
		setData(copy);
		props.setData(copy);
	};

	const skills = SourcebookLogic.getSkills(props.sourcebooks as Sourcebook[])
		.filter(skill => (data.options.includes(skill.name)) || (data.listOptions.includes(skill.list)));
	const distinctSkills = Collections.distinct(skills, s => s.name);
	const sortedSkills = Collections.sort(distinctSkills, s => s.name);

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<HeaderText>Options</HeaderText>
			<Select
				style={{ width: '100%' }}
				placeholder='Skills'
				allowClear={true}
				mode='tags'
				options={SourcebookLogic.getSkills(props.sourcebooks).map(option => ({ value: option.name, description: option.description }))}
				optionRender={option => <Field label={option.data.value} value={option.data.description} />}
				value={data.options}
				onChange={setSkillOptions}
			/>
			<HeaderText>List Options</HeaderText>
			<Select
				style={{ width: '100%' }}
				placeholder='Skill Lists'
				allowClear={true}
				mode='multiple'
				options={[ SkillList.Crafting, SkillList.Exploration, SkillList.Interpersonal, SkillList.Intrigue, SkillList.Lore ].map(option => ({ value: option }))}
				optionRender={option => <div className='ds-text'>{option.data.value}</div>}
				value={data.listOptions}
				onChange={setSkillListOptions}
			/>
			<HeaderText>Count</HeaderText>
			<NumberSpin min={1} value={data.count} onChange={setCount} />
			<HeaderText>Default Selection</HeaderText>
			<Select
				style={{ width: '100%' }}
				placeholder='Selection'
				allowClear={true}
				mode='tags'
				options={sortedSkills.map(option => ({ value: option.name }))}
				optionRender={option => <div className='ds-text'>{option.data.value}</div>}
				value={data.selected}
				onChange={setSkillSelected}
			/>
		</Space>
	);
};

interface ConfigProps {
	data: FeatureSkillChoiceData;
	feature: Feature;
	hero: Hero;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureSkillChoiceData) => void;
}

export const ConfigSkillChoice = (props: ConfigProps) => {
	const heroSkills = HeroLogic.getSkills(props.hero, props.sourcebooks).map(s => s.name);
	const selectedSkills = props.data.selected;
	const count = props.data.count;
	const isSingle = count === 1;

	// All skills available to this choice (from explicit options + skill lists). Don't filter out
	// hero's other skills — they're still part of the list, just shown as disabled-duplicates.
	const availableSkills = Collections.sort(
		Collections.distinct(
			SourcebookLogic.getSkills(props.sourcebooks)
				.filter(skill => props.data.options.includes(skill.name) || props.data.listOptions.includes(skill.list)),
			s => s.name
		),
		s => s.name
	);

	const toggleSkill = (skillName: string) => {
		const isSelected = selectedSkills.includes(skillName);
		const dataCopy = Utils.copy(props.data);
		if (isSelected) {
			dataCopy.selected = dataCopy.selected.filter(s => s !== skillName);
		} else if (isSingle) {
			dataCopy.selected = [ skillName ];
		} else if (count === -1 || selectedSkills.length < count) {
			dataCopy.selected.push(skillName);
		} else {
			return;
		}
		props.setData(dataCopy);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				{count === 1 ? 'Choose 1 skill.' : `Choose ${count} skill${count === 1 ? '' : 's'}.`}
			</div>
			{
				availableSkills.map(skill => {
					const isSelected = selectedSkills.includes(skill.name);
					const alreadyKnown = !isSelected && heroSkills.includes(skill.name);
					// Once at limit, gray every unselected option — even single-pick
					// choices. To swap, the player deselects their current pick first.
					const overLimit = !isSelected && !alreadyKnown && count !== -1 && selectedSkills.length >= count;
					const disabled = alreadyKnown || overLimit;
					return (
						<div
							key={skill.name}
							className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
							onClick={() => !disabled && toggleSkill(skill.name)}
							title={alreadyKnown ? 'You already have this skill' : undefined}
						>
							<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
							<div className='choice-option-body'>
								<div className='choice-option-name'>{skill.name}</div>
								<div className='choice-option-content'>{skill.description}</div>
							</div>
						</div>
					);
				})
			}
		</Space>
	);
};
