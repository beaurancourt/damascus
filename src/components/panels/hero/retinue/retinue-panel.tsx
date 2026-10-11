import { Collections } from '@/utils/collections';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Follower } from '@/models/follower';
import { FollowerPanel } from '@/components/panels/elements/follower-panel/follower-panel';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Monster } from '@/models/monster';
import { MonsterPanel } from '@/components/panels/elements/monster-panel/monster-panel';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SummoningInfo } from '@/models/summon';
import { useOptions } from '@/contexts/data-context';

import './retinue-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onSelectMonster: (hero: Hero, monster: Monster, summon?: SummoningInfo) => void;
	onSelectFollower: (hero: Hero, follower: Follower) => void;
}

export const RetinuePanel = (props: Props) => {
	const options = useOptions();
	const useRows = options.compactView;

	const monsters: { monster: Monster, summon?: SummoningInfo }[] = [
		...HeroLogic.getCompanions(props.hero).map(m => ({ monster: m, summon: undefined })),
		...HeroLogic.getRetainers(props.hero).map(m => ({ monster: m, summon: undefined })),
		...HeroLogic.getSummons(props.hero).map(m => ({ monster: m.monster, summon: m.info }))
	];

	const followers = HeroLogic.getFollowers(props.hero);

	return (
		<ErrorBoundary>
			<div className='retinue-section'>
				{
					monsters.length > 0 ?
						<>
							<div className={`retinue-grid ${useRows ? 'compact' : ''} medium`}>
								{
									Collections.sort(monsters, m => m.monster.name).map(m =>
										useRows ?
											<div key={m.monster.id} className='selectable-row clickable' onClick={() => props.onSelectMonster(props.hero, m.monster, m.summon)}>
												<div>Companion: <b>{m.monster.name}</b></div>
											</div>
											:
											<SelectablePanel key={m.monster.id} onSelect={() => props.onSelectMonster(props.hero, m.monster, m.summon)}>
												<MonsterPanel monster={m.monster} summon={m.summon} sourcebooks={props.sourcebooks} />
											</SelectablePanel>
									)
								}
							</div>
						</>
						: null
				}
				{
					followers.length > 0 ?
						<>
							<HeaderText level={options.compactView ? 3 : 1}>Followers</HeaderText>
							<div className={`retinue-grid ${useRows ? 'compact' : ''} medium`}>
								{
									followers.map(follower =>
										useRows ?
											<div key={follower.id} className='selectable-row clickable' onClick={() => props.onSelectFollower(props.hero, follower)}>
												<div>Follower: <b>{follower.name}</b></div>
											</div>
											:
											<SelectablePanel key={follower.id} onSelect={() => props.onSelectFollower(props.hero, follower)}>
												<FollowerPanel follower={follower} />
											</SelectablePanel>
									)
								}
							</div>
						</>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
