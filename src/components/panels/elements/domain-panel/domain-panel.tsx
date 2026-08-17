import { Alert, Flex } from 'antd';
import { Domain } from '@/models/domain';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Expander } from '@/components/controls/expander/expander';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { Markdown } from '@/components/controls/markdown/markdown';
import { PanelMode } from '@/enums/panel-mode';
import { Pill } from '@/components/controls/pill/pill';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';

import './domain-panel.scss';

interface Props {
	domain: Domain;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
}

export const DomainPanel = (props: Props) => {
	const getOverview = () => {
		return (
			<Markdown text={props.domain.description} />
		);
	};

	const getFeatures = () => {
		return (
			<div className='domain-features-list'>
				{
					props.domain.featuresByLevel.filter(lvl => lvl.features.length > 0).map(lvl => {
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

	const getAdditional = () => {
		return (
			<div className='domain-features-list'>
				<Alert
					type='info'
					showIcon={true}
					title='The features on this page are used by the Conduit class.'
				/>
				{
					props.domain.resourceGains.length > 0 ?
						<>
							<HeaderText>Resource Gains</HeaderText>
							<ul>
								{
									props.domain.resourceGains.map((g, n) => (
										<li key={n}>
											<Flex align='center' justify='space-between' gap={10}>
												<div className='ds-text compact-text'>{g.trigger}</div>
												<Pill>+{g.value}</Pill>
											</Flex>
										</li>
									))
								}
							</ul>
						</>
						: null
				}
				{
					props.domain.defaultFeatures.map(f => {
						return (
							<FeaturePanel key={f.id} feature={f} hero={props.hero} sourcebooks={props.sourcebooks} mode={PanelMode.Full} />
						);
					})
				}
				{
					(props.domain.resourceGains.length === 0) && (props.domain.defaultFeatures.length === 0) ?
						<Empty />
						: null
				}
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
				<HeaderText level={2}>Additional</HeaderText>
				{getAdditional()}
			</>
		);
	};

	const tags = [];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getDomainSourcebook(props.sourcebooks, props.domain)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='domain-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.domain.name || 'Unnamed Domain'}
				</HeaderText>
				<Markdown text={props.domain.description} />
			</div>
		);
	}

	return (
		<ErrorBoundary>
			<div className='domain-panel'>
				<HeaderText level={1} tags={tags}>
					{props.domain.name || 'Unnamed Domain'}
				</HeaderText>
				{getContent()}
			</div>
		</ErrorBoundary>
	);
};
