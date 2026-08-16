import { Feature, FeatureData } from '@/models/feature';
import { Career } from '@/models/career';
import { DoneBadge } from '@/components/controls/done-badge/done-badge';
import { Element } from '@/models/element';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeatureConfigPanel } from '@/components/panels/feature-config-panel/feature-config-panel';
import { FeatureLogic } from '@/logic/feature-logic';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { Markdown } from '@/components/controls/markdown/markdown';
import { PanelMode } from '@/enums/panel-mode';
import { ReactNode } from 'react';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';

import './career-panel.scss';
import '@/components/features/feature-data/choice.scss';

interface Props {
	career: Career;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
	setFeatureData?: (featureID: string, data: FeatureData) => void;
	onSelectIncitingIncident?: (incident: Element | null) => void;
}

export const CareerPanel = (props: Props) => {
	const tags = [];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getCareerSourcebook(props.sourcebooks, props.career)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='career-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.career.name || 'Unnamed Career'}
				</HeaderText>
				<Markdown text={props.career.description} />
			</div>
		);
	}

	// Render a feature: config panel if it's a choice in edit mode, otherwise the info panel.
	// Mirrors AncestryPanel / CulturePanel.
	const renderFeature = (feature: Feature): ReactNode[] => {
		const editing = !!(props.setFeatureData && props.hero);

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

	const editing = !!(props.setFeatureData && props.hero && props.onSelectIncitingIncident);
	const selectedIncident = props.career.incitingIncidents.selected;

	return (
		<ErrorBoundary>
			<div className='career-panel'>
				<HeaderText level={1} tags={tags}>
					{props.career.name || 'Unnamed Career'}
				</HeaderText>
				<Markdown text={props.career.description} />
				{props.career.features.flatMap(f => renderFeature(f))}
				<HeaderText extra={selectedIncident ? <DoneBadge /> : null}>Inciting Incident</HeaderText>
				<div className='ds-text'>Choose 1 of the following:</div>
				{
					props.career.incitingIncidents.options.map(opt => {
						const isSelected = selectedIncident?.id === opt.id;
						// Once an incident is picked, gray every other option to
						// signal the choice is resolved. To swap, deselect first.
						const disabled = editing && !isSelected && !!selectedIncident;
						return (
							<div
								key={opt.id}
								className={`choice-option${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
								onClick={() => {
									if (!editing || disabled) { return; }
									props.onSelectIncitingIncident!(isSelected ? null : opt);
								}}
								style={editing ? undefined : { cursor: 'default' }}
							>
								<div className='choice-option-indicator'>{isSelected ? '●' : '○'}</div>
								<div className='choice-option-body'>
									<div className='choice-option-name'>{opt.name}</div>
									<div className='choice-option-content'><Markdown text={opt.description} useSpan={true} /></div>
								</div>
							</div>
						);
					})
				}
			</div>
		</ErrorBoundary>
	);
};
