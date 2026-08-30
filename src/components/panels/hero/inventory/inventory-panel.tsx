import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';

import './inventory-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
}

// Items ride the same feature pipeline as feats, so they'd otherwise show up
// intermingled with them in the Features section. This panel collects the
// item-sourced features into their own Inventory section instead.
export const InventoryPanel = (props: Props) => {
	const interestingTypes = [ FeatureType.Text, FeatureType.HeroicResource, FeatureType.Package, FeatureType.SummonFormation ];
	const itemNames = new Set(HeroLogic.getInventoryItems(props.hero).map(i => i.name));
	const features = HeroLogic.getFeatures(props.hero)
		.filter(f => interestingTypes.includes(f.feature.type))
		.filter(f => itemNames.has(f.source))
		.sort((a, b) => a.feature.name.localeCompare(b.feature.name));

	if (features.length === 0) {
		return null;
	}

	return (
		<ErrorBoundary>
			<div className='inventory-section' data-hero-section='Inventory'>
				<HeaderText>Inventory</HeaderText>
				{
					features.map(f => (
						<FeaturePanel
							key={f.feature.id}
							feature={f.feature}
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
