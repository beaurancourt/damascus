import { Culture } from '@/models/culture';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Feature, FeatureData } from '@/models/feature';
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

import './culture-panel.scss';

interface Props {
	culture: Culture;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
	setFeatureData?: (featureID: string, data: FeatureData) => void;
}

export const CulturePanel = (props: Props) => {
	const tags: string[] = [ props.culture.type ];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getCultureSourcebook(props.sourcebooks, props.culture)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='culture-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.culture.name || 'Unnamed Culture'}
				</HeaderText>
				<Markdown text={props.culture.description} />
			</div>
		);
	}

	// Render a culture sub-feature: choose config-panel vs info-panel based on edit mode + feature type.
	// Mirrors AncestryPanel.renderFeature so nested Choice / Multiple features collapse cleanly.
	const renderFeature = (feature: Feature | undefined | null): ReactNode[] => {
		if (!feature) {
			return [];
		}

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

	return (
		<ErrorBoundary>
			<div className='culture-panel'>
				<HeaderText level={1} tags={tags}>
					{props.culture.name || 'Unnamed Culture'}
				</HeaderText>
				<Markdown text={props.culture.description} />
				{renderFeature(props.culture.language)}
				{renderFeature(props.culture.environment)}
				{renderFeature(props.culture.organization)}
				{renderFeature(props.culture.upbringing)}
			</div>
		</ErrorBoundary>
	);
};
