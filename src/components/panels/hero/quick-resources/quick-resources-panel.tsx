import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeatureType } from '@/enums/feature-type';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroModalType } from '@/enums/hero-modal-type';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Utils } from '@/utils/utils';

import './quick-resources-panel.scss';

interface Props {
	hero: Hero;
	onChange: (hero: Hero) => void;
	onShowState: (type: HeroModalType) => void;
}

// Inline "quick" editor for the values that get tweaked at the table during play
// (heroic resource, surges, victories, XP). Renown/Wealth are class-derived and
// rarely manually edited — left in the modal under the "more" link.
export const QuickResourcesPanel = (props: Props) => {
	const heroicResources = HeroLogic.getHeroicResources(props.hero);

	const setHeroicResource = (featureID: string, value: number) => {
		const copy = Utils.copy(props.hero);
		HeroLogic.getFeatures(copy, false)
			.map(f => f.feature)
			.filter(f => f.type === FeatureType.HeroicResource)
			.filter(f => f.id === featureID)
			.forEach(f => f.data.value = value);
		props.onChange(copy);
	};

	const setSurges = (value: number) => {
		// Shallow copy keeps the hero's structural fields (class, features, ...)
		// reference-stable so derived panels can memoize; only the state value
		// changes here.
		const copy = { ...props.hero, state: { ...props.hero.state, surges: value } };
		props.onChange(copy);
	};

	const setVictories = (value: number) => {
		const copy = { ...props.hero, state: { ...props.hero.state, victories: value } };
		props.onChange(copy);
	};

	const setXP = (value: number) => {
		const copy = { ...props.hero, state: { ...props.hero.state, xp: value } };
		props.onChange(copy);
	};

	const setWealth = (value: number) => {
		const copy = { ...props.hero, state: { ...props.hero.state, wealth: value } };
		props.onChange(copy);
	};

	return (
		<ErrorBoundary>
			<div className='quick-resources-panel'>
				{
					heroicResources.map(hr => (
						<NumberSpin
							key={hr.id}
							label={hr.name}
							value={hr.value}
							min={0}
							onChange={value => setHeroicResource(hr.id, value)}
						/>
					))
				}
				<NumberSpin label='Surges' value={props.hero.state.surges} min={0} onChange={setSurges} />
				<NumberSpin label='Victories' value={props.hero.state.victories} min={0} onChange={setVictories} />
				<NumberSpin label='XP' value={props.hero.state.xp} min={0} onChange={setXP} />
				<NumberSpin label='Wealth' value={props.hero.state.wealth} format={() => HeroLogic.getWealth(props.hero).toString()} onChange={setWealth} />
				<div className='quick-resources-display'>
					<div className='quick-resources-stat'>
						<div className='label'>Renown</div>
						<div className='value'>{HeroLogic.getRenown(props.hero)}</div>
					</div>
				</div>
				<button
					type='button'
					className='quick-resources-more'
					onClick={() => props.onShowState(HeroModalType.Resources)}
				>
					More resources & level up →
				</button>
			</div>
		</ErrorBoundary>
	);
};
