import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { useOptions } from '@/contexts/data-context';

import './heroic-resource-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
}

// How a hero generates their heroic resource is the thing a player re-reads most
// often mid-fight, so it sits with the resource counter it feeds rather than
// alphabetized among the feats. It keeps its own header, which also puts it in
// the sheet's jump-to-section list.
export const HeroicResourcePanel = (props: Props) => {
	const options = useOptions();

	const features = HeroLogic.getFeatures(props.hero)
		.filter(f => f.feature.type === FeatureType.HeroicResource)
		.sort((a, b) => a.feature.name.localeCompare(b.feature.name));

	if (features.length === 0) {
		return null;
	}

	return (
		<ErrorBoundary>
			<div className='heroic-resource-section' data-hero-section='Heroic Resource'>
				<HeaderText level={3}>Heroic Resource</HeaderText>
				{
					features.map(f => (
						<FeaturePanel
							key={f.feature.id}
							feature={f.feature}
							source={options.showSources ? (f.level ? `${f.source} (level ${f.level})` : f.source) : undefined}
							hero={props.hero}
							sourcebooks={props.sourcebooks}
							mode={PanelMode.Full}
						/>
					))
				}
			</div>
		</ErrorBoundary>
	);
};
