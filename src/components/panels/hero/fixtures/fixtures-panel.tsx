import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Fixture } from '@/models/fixture';
import { FixturePanel } from '@/components/panels/elements/fixture-panel/fixture-panel';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { useOptions } from '@/contexts/data-context';

import './fixtures-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onSelectFixture: (fixture: Fixture) => void;
}

// A summoner's fixture is conjured into the fight by Summoner's Dominion, so it
// belongs with the other creatures the player tracks in combat - between the
// controlled monsters and the main actions - rather than at the foot of the
// sheet with the retinue.
export const FixturesPanel = (props: Props) => {
	const options = useOptions();
	const useRows = options.compactView;

	const fixtures = HeroLogic.getFixtures(props.hero);
	if (fixtures.length === 0) {
		return null;
	}

	return (
		<ErrorBoundary>
			<div className='fixtures-section' data-hero-section='Fixtures'>
				<HeaderText level={options.compactView ? 3 : 1}>Fixtures</HeaderText>
				<div className={`fixtures-grid ${useRows ? 'compact' : ''} medium`}>
					{
						fixtures.map(fixture =>
							useRows ?
								<div key={fixture.id} className='selectable-row clickable' onClick={() => props.onSelectFixture(fixture)}>
									<div>Fixture: <b>{fixture.name}</b></div>
								</div>
								:
								<SelectablePanel key={fixture.id} onSelect={() => props.onSelectFixture(fixture)}>
									<FixturePanel fixture={fixture} hero={props.hero} sourcebooks={props.sourcebooks} />
								</SelectablePanel>
						)
					}
				</div>
			</div>
		</ErrorBoundary>
	);
};
