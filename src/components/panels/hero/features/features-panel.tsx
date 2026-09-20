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

	// Features worth surfacing on the hero sheet — Text/Package and explicit
	// per-feature opt-ins. Skip Ability features (those have their own Abilities
	// tab), Companion/Follower/Retainer (those render via the Retinue section) and
	// HeroicResource, which has its own section near the top of the sheet.
	const interestingTypes = [ FeatureType.Text, FeatureType.Package, FeatureType.SummonFormation ];
	// Items surface through the same feature pipeline but belong in their own
	// Inventory section, not intermingled with feats.
	const itemNames = new Set(HeroLogic.getInventoryItems(props.hero).map(i => i.name));
	const features = HeroLogic.getFeatures(props.hero)
		.filter(f => interestingTypes.includes(f.feature.type))
		.filter(f => !itemNames.has(f.source))
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
