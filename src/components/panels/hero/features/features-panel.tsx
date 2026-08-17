import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Feature } from '@/models/feature';
import { FeaturePanel } from '../../elements/feature-panel/feature-panel';
import { FeatureType } from '@/enums/feature-type';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { useOptions } from '@/contexts/data-context';

import './features-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onSelectFeature: (feature: Feature) => void;
}

export const FeaturesPanel = (props: Props) => {
	const options = useOptions();

	// Features worth surfacing on the hero sheet — Text/HeroicResource/Package and explicit
	// per-feature opt-ins. Skip Ability features (those have their own Abilities tab) and
	// Companion/Follower/Retainer (those render via the Retinue section).
	const interestingTypes = [ FeatureType.Text, FeatureType.HeroicResource, FeatureType.Package, FeatureType.SummonFormation ];
	const features = HeroLogic.getFeatures(props.hero)
		.filter(f => interestingTypes.includes(f.feature.type))
		.sort((a, b) => a.feature.name.localeCompare(b.feature.name));

	return (
		<ErrorBoundary>
			<div className='features-section' data-hero-section='Features'>
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
