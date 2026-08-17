import { AbilityPanel } from '@/components/panels/elements/ability-panel/ability-panel';
import { CSSProperties } from 'react';
import { Collections } from '@/utils/collections';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Expander } from '@/components/controls/expander/expander';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { Markdown } from '@/components/controls/markdown/markdown';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';
import { SubClass } from '@/models/subclass';

import './subclass-panel.scss';

interface Props {
	subclass: SubClass;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
	style?: CSSProperties;
}

export const SubclassPanel = (props: Props) => {
	const getOverview = () => {
		return (
			<Markdown text={props.subclass.description} />
		);
	};

	const getFeatures = () => {
		return (
			<div className='subclass-features-list'>
				{
					props.subclass.featuresByLevel.filter(lvl => lvl.features.length > 0).map(lvl => {
						return (
							<Expander
								key={lvl.level}
								title={
									<Field
										label={`Level ${lvl.level.toString()}`}
										value={lvl.features.map(f => f.name).join(', ')}
									/>
								}
							>
								{
									...lvl.features.map(f =>
										<FeaturePanel key={f.id} feature={f} hero={props.hero} sourcebooks={props.sourcebooks} mode={PanelMode.Full} />
									)
								}
							</Expander>
						);
					})
				}
			</div>
		);
	};

	const getAbilities = () => {
		const costs = Collections.distinct(
			props.subclass.abilities
				.map(a => a.cost)
				.filter(c => c !== 'signature')
				.sort((a, b) => a - b),
			x => x
		);

		return (
			<div className='subclass-abilities-list'>
				{
					[ 'signature', ...costs ].map(cost => {
						const abilities = props.subclass.abilities.filter(a => a.cost === cost);
						if (abilities.length === 0) {
							return null;
						}
						return (
							<Expander key={cost} title={cost === 'signature' ? 'Signature Abilities' : `${cost}pt Abilities`}>
								<div className='subclass-abilities-grid'>
									{
										abilities.map(a => (
											<SelectablePanel key={a.id}>
												<AbilityPanel ability={a} hero={props.hero} mode={PanelMode.Full} />
											</SelectablePanel>
										))
									}
								</div>
							</Expander>
						);
					})
				}
				{props.subclass.abilities.length === 0 ? <Empty /> : null}
			</div>
		);
	};

	// Sections stacked rather than tabbed: a library entry is something you read,
	// and two thirds of it being one click away made you click to find out
	// whether there was anything there.
	const getContent = () => {
		return (
			<>
				{getOverview()}
				<HeaderText level={2}>Features</HeaderText>
				{getFeatures()}
				{
					props.subclass.abilities.length > 0 ?
						<>
							<HeaderText level={2}>Abilities</HeaderText>
							{getAbilities()}
						</>
						: null
				}
			</>
		);
	};

	const tags = [];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getSubclassSourcebook(props.sourcebooks, props.subclass)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='subclass-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.subclass.name || 'Unnamed Subclass'}
				</HeaderText>
				<Markdown text={props.subclass.description} />
			</div>
		);
	}

	return (
		<ErrorBoundary>
			<div className='subclass-panel' style={props.style}>
				<HeaderText level={1} tags={tags}>
					{props.subclass.name || 'Unnamed Subclass'}
				</HeaderText>
				{getContent()}
			</div>
		</ErrorBoundary>
	);
};
