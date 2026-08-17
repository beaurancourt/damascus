import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Markdown } from '@/components/controls/markdown/markdown';
import { Negotiation } from '@/models/negotiation';
import { NegotiationLogic } from '@/logic/negotiation-logic';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';
import { StatsRow } from '@/components/panels/stats-row/stats-row';

import './negotiation-panel.scss';

interface Props {
	negotiation: Negotiation;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
}

export const NegotiationPanel = (props: Props) => {
	const getOverview = () => {
		return (
			<>
				<Markdown text={props.negotiation.description} />
				<StatsRow>
					<Field orientation='vertical' label='Attitude' value={props.negotiation.attitude} />
					<Field orientation='vertical' label='Interest' value={props.negotiation.interest} />
					<Field orientation='vertical' label='Patience' value={props.negotiation.patience} />
					<Field orientation='vertical' label='Impression' value={props.negotiation.impression} />
				</StatsRow>
			</>
		);
	};

	const getMotivations = () => {
		return (
			<>
				{props.negotiation.motivations.map((t, n) => <Field key={n} label={t.trait} value={<Markdown text={t.description || NegotiationLogic.getMotivationDescription(t.trait)} useSpan={true} />} />)}
				{props.negotiation.motivations.length === 0 ? <div className='ds-text dimmed-text'>None</div> : null}
			</>
		);
	};

	const getPitfalls = () => {
		return (
			<>
				{props.negotiation.pitfalls.map((t, n) => <Field key={n} label={t.trait} value={<Markdown text={t.description || NegotiationLogic.getPitfallDescription(t.trait)} useSpan={true} />} />)}
				{props.negotiation.pitfalls.length === 0 ? <div className='ds-text dimmed-text'>None</div> : null}
			</>
		);
	};

	const getLanguages = () => {
		return (
			<>
				{props.negotiation.languages.map(l => SourcebookLogic.getLanguage(l, props.sourcebooks)).filter(l => !!l).map((l, n) => <Field key={n} label={l.name} value={l.description} />)}
				{props.negotiation.languages.length === 0 ? <div className='ds-text dimmed-text'>None</div> : null}
			</>
		);
	};

	const getOutcomes = () => {
		return (
			<>
				<Field label='5' value={<Markdown text={props.negotiation.outcomes[5] || 'Yes, and...'} useSpan={true} />} />
				<Field label='4' value={<Markdown text={props.negotiation.outcomes[4] || 'Yes'} useSpan={true} />} />
				<Field label='3' value={<Markdown text={props.negotiation.outcomes[3] || 'Yes, but...'} useSpan={true} />} />
				<Field label='2' value={<Markdown text={props.negotiation.outcomes[2] || 'No, but...'} useSpan={true} />} />
				<Field label='1' value={<Markdown text={props.negotiation.outcomes[1] || 'No'} useSpan={true} />} />
				<Field label='0' value={<Markdown text={props.negotiation.outcomes[0] || 'No, and...'} useSpan={true} />} />
			</>
		);
	};

	// Sections stacked rather than tabbed: a library entry is something you read,
	// and two thirds of it being one click away made you click to find out
	// whether there was anything there.
	const getContent = () => {
		return (
			<>
				{getOverview()}
				<HeaderText level={2}>Motivations</HeaderText>
				{getMotivations()}
				<HeaderText level={2}>Pitfalls</HeaderText>
				{getPitfalls()}
				<HeaderText level={2}>Languages</HeaderText>
				{getLanguages()}
				<HeaderText level={2}>Outcomes</HeaderText>
				{getOutcomes()}
			</>
		);
	};

	const tags = [];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getNegotiationSourcebook(props.sourcebooks, props.negotiation)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='negotiation-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.negotiation.name || 'Unnamed Negotiation'}
				</HeaderText>
				<Markdown text={props.negotiation.description} />
			</div>
		);
	}

	return (
		<ErrorBoundary>
			<div className='negotiation-panel'>
				<HeaderText level={1} tags={tags}>
					{props.negotiation.name || 'Unnamed Negotiation'}
				</HeaderText>
				{getContent()}
			</div>
		</ErrorBoundary>
	);
};
