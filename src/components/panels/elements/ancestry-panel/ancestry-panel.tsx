import { Feature, FeatureData } from '@/models/feature';
import { Ancestry } from '@/models/ancestry';
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

import './ancestry-panel.scss';

interface Props {
	ancestry: Ancestry;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
	setFeatureData?: (featureID: string, data: FeatureData) => void;
}

export const AncestryPanel = (props: Props) => {
	const tags = [];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getAncestrySourcebook(props.sourcebooks, props.ancestry)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='ancestry-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.ancestry.name || 'Unnamed Ancestry'}
				</HeaderText>
				<Markdown text={props.ancestry.description} />
			</div>
		);
	}

	// Render a single feature, choosing config-panel vs info-panel based on edit mode + feature type.
	// For Multiple containers, recurse into sub-features so nested choices appear inline as configurators.
	const renderFeature = (feature: Feature, cost?: number): ReactNode[] => {
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
				cost={cost}
				hero={props.hero}
				sourcebooks={props.sourcebooks}
				mode={PanelMode.Full}
			/>
		];
	};

	return (
		<ErrorBoundary>
			<div className='ancestry-panel'>
				<HeaderText level={1} tags={tags}>
					{props.ancestry.name || 'Unnamed Ancestry'}
				</HeaderText>
				<Markdown text={props.ancestry.description} />
				{props.ancestry.features.flatMap(f => renderFeature(f))}
				{
					props.ancestry.culture ?
						<FeaturePanel
							feature={props.ancestry.culture.language}
							hero={props.hero}
							sourcebooks={props.sourcebooks}
							mode={PanelMode.Full}
						/>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
