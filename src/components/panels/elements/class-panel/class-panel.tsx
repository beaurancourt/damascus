import { Feature, FeatureData } from '@/models/feature';
import { AbilityPanel } from '@/components/panels/elements/ability-panel/ability-panel';
import { Collections } from '@/utils/collections';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeatureConfigPanel } from '@/components/panels/feature-config-panel/feature-config-panel';
import { FeatureLogic } from '@/logic/feature-logic';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { FeatureType } from '@/enums/feature-type';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroClass } from '@/models/class';
import { Markdown } from '@/components/controls/markdown/markdown';
import { PanelMode } from '@/enums/panel-mode';
import { ReactNode } from 'react';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';

import './class-panel.scss';

interface Props {
	heroClass: HeroClass;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
	setFeatureData?: (featureID: string, data: FeatureData) => void;
}

export const ClassPanel = (props: Props) => {
	const tags = [];
	if (props.heroClass.type === 'master') {
		tags.push('Master Class');
	}
	const levels = props.heroClass.featuresByLevel.filter(lvl => lvl.features.length > 0).map(lvl => lvl.level);
	const minLevel = Collections.min(levels, x => x);
	const maxLevel = Collections.max(levels, x => x);
	if ((minLevel !== 1) || (maxLevel !== 10)) {
		if (minLevel === maxLevel) {
			tags.push(`Level ${minLevel}`);
		} else {
			tags.push(`Levels ${minLevel}-${maxLevel}`);
		}
	}
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getClassSourcebook(props.sourcebooks, props.heroClass)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='class-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.heroClass.name || 'Unnamed Class'}
				</HeaderText>
				<Markdown text={props.heroClass.description} />
			</div>
		);
	}

	const editing = !!(props.setFeatureData && props.hero);
	const visibleMax = editing ? props.heroClass.level : 10;

	const renderFeature = (feature: Feature): ReactNode[] => {
		if (editing && FeatureLogic.isChoice(feature)) {
			return [
				<FeatureConfigPanel
					key={feature.id}
					feature={feature}
					hero={props.hero!}
					sourcebooks={props.sourcebooks}
					setData={props.setFeatureData!}
				/>
			];
		}

		if (editing && feature.type === FeatureType.Multiple) {
			return feature.data.features.flatMap(sub => renderFeature(sub));
		}

		return [
			<FeaturePanel
				key={feature.id}
				feature={feature}
				hero={props.hero}
				sourcebooks={props.sourcebooks}
				mode={PanelMode.Full}
			/>
		];
	};

	const abilityCosts = Collections.distinct(
		props.heroClass.abilities
			.map(a => a.cost)
			.filter(c => c !== 'signature')
			.sort((a, b) => a - b),
		x => x
	);

	return (
		<ErrorBoundary>
			<div className='class-panel'>
				<HeaderText level={1} tags={tags}>
					{props.heroClass.name || 'Unnamed Class'}
				</HeaderText>
				<Markdown text={props.heroClass.description} />
				<Field
					label='Primary Characteristics'
					value={props.heroClass.primaryCharacteristics.join(', ') || props.heroClass.primaryCharacteristicsOptions.map(arr => arr.join(', ') || 'None').join(' or ') || 'None'}
				/>
				{
					props.heroClass.subclasses.length > 0 ?
						<Field
							label={`${props.heroClass.subclassName}s`}
							value={props.heroClass.subclasses.map(c => c.name).join(', ')}
						/>
						: null
				}
				{
					Collections.distinct(
						[
							...props.heroClass.featuresByLevel.map(lvl => lvl.level),
							...props.heroClass.subclasses.filter(sc => sc.selected).flatMap(sc => sc.featuresByLevel.map(lvl => lvl.level))
						],
						x => x
					)
						.sort((a, b) => a - b)
						.filter(level => level <= visibleMax)
						.map(level => {
							const classFeatures = props.heroClass.featuresByLevel.find(lvl => lvl.level === level)?.features || [];
							const subclassFeatures = props.heroClass.subclasses
								.filter(sc => sc.selected)
								.flatMap(sc => sc.featuresByLevel.find(lvl => lvl.level === level)?.features || []);
							const features = [ ...classFeatures, ...subclassFeatures ];
							if (features.length === 0) {
								return null;
							}
							return (
								<div key={level} className='class-level-block'>
									<HeaderText>Level {level}</HeaderText>
									{features.flatMap(f => renderFeature(f))}
								</div>
							);
						})
				}
				{
					!editing && props.heroClass.abilities.length > 0 ?
						<div className='class-abilities-block'>
							<HeaderText>Abilities</HeaderText>
							{
								[ 'signature' as const, ...abilityCosts ].map(cost => {
									const abilities = props.heroClass.abilities.filter(a => a.cost === cost);
									if (abilities.length === 0) {
										return null;
									}
									return (
										<div key={cost} className='class-abilities-cost-group'>
											<HeaderText level={3}>{cost === 'signature' ? 'Signature Abilities' : `${cost}pt Abilities`}</HeaderText>
											{abilities.map(a => (
												<AbilityPanel key={a.id} ability={a} hero={props.hero} mode={PanelMode.Full} />
											))}
										</div>
									);
								})
							}
						</div>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
