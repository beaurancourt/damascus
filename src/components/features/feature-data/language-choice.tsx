import { Select, Space } from 'antd';
import { Feature, FeatureLanguageChoiceData } from '@/models/feature';
import { Collections } from '@/utils/collections';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './choice.scss';

interface InfoProps {
	data: FeatureLanguageChoiceData;
	feature: Feature;
	hero?: Hero;
	sourcebooks?: Sourcebook[];
}

export const InfoLanguageChoice = (props: InfoProps) => {
	if (props.data.selected.length > 0) {
		return (
			<Field label='Language' value={props.data.selected.join(', ')} />
		);
	}

	return (
		<div className='ds-text'>Choose {props.data.count > 1 ? props.data.count : 'a'} {props.data.count > 1 ? 'languages' : 'language'}.</div>
	);
};

interface EditProps {
	data: FeatureLanguageChoiceData;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureLanguageChoiceData) => void;
}

export const EditLanguageChoice = (props: EditProps) => {
	const [ data, setData ] = useState<FeatureLanguageChoiceData>(Utils.copy(props.data));

	const setLanguageOptions = (value: string[]) => {
		const copy = Utils.copy(data);
		copy.options = value;
		setData(copy);
		props.setData(copy);
	};

	const setCount = (value: number) => {
		const copy = Utils.copy(data);
		copy.count = value;
		setData(copy);
		props.setData(copy);
	};

	const setLanguageSelected = (value: string[]) => {
		const copy = Utils.copy(data);
		copy.selected = value;
		setData(copy);
		props.setData(copy);
	};

	const languages = SourcebookLogic.getLanguages(props.sourcebooks as Sourcebook[]);
	const distinctLanguages = Collections.distinct(languages, l => l.name);
	const sortedLanguages = Collections.sort(distinctLanguages, l => l.name);

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<HeaderText>Options</HeaderText>
			<Select
				style={{ width: '100%' }}
				status={data.options.length === 0 ? 'warning' : ''}
				placeholder='Options'
				mode='tags'
				allowClear={true}
				options={SourcebookLogic.getLanguages(props.sourcebooks).map(option => ({ value: option.name, description: option.description }))}
				optionRender={option => <Field label={option.data.value} value={option.data.description} />}
				value={data.options}
				onChange={setLanguageOptions}
			/>
			<HeaderText>Count</HeaderText>
			<NumberSpin min={1} value={data.count} onChange={setCount} />
			<HeaderText>Default Selection</HeaderText>
			<Select
				style={{ width: '100%' }}
				placeholder='Selection'
				allowClear={true}
				mode='tags'
				options={sortedLanguages.map(option => ({ value: option.name }))}
				optionRender={option => <div className='ds-text'>{option.data.value}</div>}
				value={data.selected}
				onChange={setLanguageSelected}
			/>
		</Space>
	);
};

interface ConfigProps {
	data: FeatureLanguageChoiceData;
	feature: Feature;
	hero: Hero;
	sourcebooks: Sourcebook[];
	setData: (data: FeatureLanguageChoiceData) => void;
}

export const ConfigLanguageChoice = (props: ConfigProps) => {
	const heroLanguages = HeroLogic.getLanguages(props.hero, props.sourcebooks).map(l => l.name);
	const selectedLanguages = props.data.selected;
	const count = props.data.count;
	const isSingle = count === 1;

	const allLanguages = Collections.sort(
		Collections.distinct(SourcebookLogic.getLanguages(props.sourcebooks), l => l.name),
		l => l.name
	);

	const toggleLanguage = (name: string) => {
		const isSelected = selectedLanguages.includes(name);
		const dataCopy = Utils.copy(props.data);
		if (isSelected) {
			dataCopy.selected = dataCopy.selected.filter(l => l !== name);
		} else if (isSingle) {
			dataCopy.selected = [ name ];
		} else if (count === -1 || selectedLanguages.length < count) {
			dataCopy.selected.push(name);
		} else {
			return;
		}
		props.setData(dataCopy);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				{count === 1 ? 'Choose 1 language.' : `Choose ${count} languages.`}
			</div>
			{
				allLanguages.map(lang => {
					const isSelected = selectedLanguages.includes(lang.name);
					const alreadyKnown = !isSelected && heroLanguages.includes(lang.name);
					const overLimit = !isSelected && !alreadyKnown && !isSingle && count !== -1 && selectedLanguages.length >= count;
					const disabled = alreadyKnown || overLimit;
					return (
						<div
							key={lang.name}
							className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
							onClick={() => !disabled && toggleLanguage(lang.name)}
							title={alreadyKnown ? 'You already know this language' : undefined}
						>
							<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
							<div className='choice-option-body'>
								<div className='choice-option-name'>{lang.name}</div>
								<div className='choice-option-content'>{lang.description}</div>
							</div>
						</div>
					);
				})
			}
		</Space>
	);
};
