import { AbilitiesPanel } from '@/components/panels/hero/abilities/abilities-panel';
import { Ability } from '@/models/ability';
import { AbilityData } from '@/data/ability-data';
import { AbilityUsage } from '@/enums/ability-usage';
import { Ancestry } from '@/models/ancestry';
import { Career } from '@/models/career';
import { Characteristic } from '@/enums/characteristic';
import { Complication } from '@/models/complication';
import { ControlledMonstersPanel } from '@/components/panels/hero/controlled-monsters/controlled-monsters-panel';
import { Culture } from '@/models/culture';
import { Domain } from '@/models/domain';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Feature } from '@/models/feature';
import { FeaturesPanel } from '@/components/panels/hero/features/features-panel';
import { Fixture } from '@/models/fixture';
import { Follower } from '@/models/follower';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroClass } from '@/models/class';
import { HeroHealthPanel } from '@/components/panels/health/health-panel';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroModalType } from '@/enums/hero-modal-type';
import { Kit } from '@/models/kit';
import { Monster } from '@/models/monster';
import { RetinuePanel } from '@/components/panels/hero/retinue/retinue-panel';
import { Sourcebook } from '@/models/sourcebook';
import { StatsPanel } from '@/components/panels/hero/stats/stats-panel';
import { SummoningInfo } from '@/models/summon';
import { Tag } from 'antd';
import { Title } from '@/models/title';
import { useOptions } from '@/contexts/data-context';

import './hero-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onSelectAncestry: (ancestry: Ancestry) => void;
	onSelectCulture: (culture: Culture) => void;
	onSelectCareer: (career: Career) => void;
	onSelectClass: (heroClass: HeroClass) => void;
	onSelectComplication: (complication: Complication) => void;
	onSelectDomain: (domain: Domain) => void;
	onSelectKit: (kit: Kit) => void;
	onSelectTitle: (title: Title) => void;
	onSelectMonster: (hero: Hero, monster: Monster, summon?: SummoningInfo) => void;
	onSelectFollower: (hero: Hero, follower: Follower) => void;
	onSelectFixture: (fixture: Fixture) => void;
	onSelectCharacteristic: (characteristic: Characteristic) => void;
	onSelectFeature: (feature: Feature) => void;
	onSelectAbility: (ability: Ability) => void;
	onShowState: (type: HeroModalType) => void;
	onAddSquad: (hero: Hero, monster: Monster, count: number) => void;
	onRemoveSquad: (hero: Hero, slotID: string) => void;
	onRemoveMonsterFromSquad: (hero: Hero, slotID: string, monsterID: string) => void;
	onAddMonsterToSquad: (hero: Hero, slotID: string) => void;
	onSelectControlledMonster: (hero: Hero, monster: Monster) => void;
	onSelectControlledSquad: (hero: Hero, slot: EncounterSlot) => void;
	updateHero?: (hero: Hero) => void;
}

export const HeroPanel = (props: Props) => {
	const options = useOptions();

	const abilities = HeroLogic.getAbilities(props.hero, props.sourcebooks, options.shownStandardAbilities);
	const mains = abilities.filter(a => a.ability.type.usage === AbilityUsage.MainAction);
	const maneuvers = abilities.filter(a => a.ability.type.usage === AbilityUsage.Maneuver);
	const moves = abilities.filter(a => a.ability.type.usage === AbilityUsage.Move);
	const triggers = abilities.filter(a => a.ability.type.usage === AbilityUsage.Trigger);

	const retinueCount = HeroLogic.getCompanions(props.hero).length
		+ HeroLogic.getFollowers(props.hero).length
		+ HeroLogic.getRetainers(props.hero).length
		+ HeroLogic.getSummons(props.hero).length
		+ HeroLogic.getFixtures(props.hero).length;

	const skills = HeroLogic.getSkills(props.hero, props.sourcebooks);
	const languages = HeroLogic.getLanguages(props.hero, props.sourcebooks);

	return (
		<ErrorBoundary>
			<div className='hero-panel'>
				<div className='hero-main-section'>
					<div className='hero-center-column'>
						<div className='center-content'>
							{/* 1. Stats + 2. Resources (handled inside StatsPanel) */}
							<StatsPanel
								hero={props.hero}
								onSelectCharacteristic={props.onSelectCharacteristic}
								onShowState={props.onShowState}
								updateHero={props.updateHero}
							/>

							{/* 3. Conditions */}
							{
								props.updateHero
									? (
										<div data-hero-section='Conditions'>
											<HeroHealthPanel
												hero={props.hero}
												showEncounterControls={false}
												sections={[ 'conditions' ]}
												onChange={props.updateHero}
											/>
										</div>
									)
									: null
							}

							{/* Controlled monsters / squads — appear close to combat actions */}
							<ControlledMonstersPanel
								hero={props.hero}
								onAddSquad={props.onAddSquad}
								onRemoveSquad={props.onRemoveSquad}
								onRemoveMonsterFromSquad={props.onRemoveMonsterFromSquad}
								onAddMonsterToSquad={props.onAddMonsterToSquad}
								onSelectControlledMonster={props.onSelectControlledMonster}
								onSelectControlledSquad={props.onSelectControlledSquad}
							/>

							{/* 4-8. Abilities by usage */}
							<AbilitiesPanel
								title='Main Actions'
								abilities={mains}
								hero={props.hero}
								onSelectAbility={props.onSelectAbility}
							/>
							<AbilitiesPanel
								title='Maneuvers'
								abilities={maneuvers}
								hero={props.hero}
								onSelectAbility={props.onSelectAbility}
							/>
							<AbilitiesPanel
								title='Move Actions'
								abilities={moves}
								hero={props.hero}
								onSelectAbility={props.onSelectAbility}
							/>
							<AbilitiesPanel
								title='Triggered Actions'
								abilities={triggers}
								hero={props.hero}
								onSelectAbility={props.onSelectAbility}
							/>
							<AbilitiesPanel
								title='Free Strikes'
								abilities={[
									{ ability: AbilityData.freeStrikeMelee, source: 'Standard', level: undefined },
									{ ability: AbilityData.freeStrikeRanged, source: 'Standard', level: undefined },
									...abilities.filter(a => a.ability.type.freeStrike)
								]}
								hero={props.hero}
								onSelectAbility={props.onSelectAbility}
							/>

							{/* 9. Features */}
							<FeaturesPanel
								hero={props.hero}
								sourcebooks={props.sourcebooks}
								onSelectFeature={props.onSelectFeature}
							/>

							{/* 10. Skills */}
							{
								skills.length > 0 ?
									<div className='hero-skills-section' data-hero-section='Skills'>
										<HeaderText>Skills</HeaderText>
										{
											skills.map(s => (
												<div key={s.name} className='ds-text'>
													{s.name} <Tag variant='outlined'>{s.list}</Tag>
												</div>
											))
										}
									</div>
									: null
							}

							{/* 11. Languages */}
							{
								languages.length > 0 ?
									<div className='hero-languages-section' data-hero-section='Languages'>
										<HeaderText>Languages</HeaderText>
										{languages.map(l => <div key={l.name} className='ds-text'>{l.name}</div>)}
									</div>
									: null
							}

							{retinueCount > 0
								? (
									<RetinuePanel
										hero={props.hero}
										sourcebooks={props.sourcebooks}
										onSelectMonster={props.onSelectMonster}
										onSelectFollower={props.onSelectFollower}
										onSelectFixture={props.onSelectFixture}
									/>
								)
								: null}
						</div>
					</div>
				</div>
			</div>
		</ErrorBoundary>
	);
};
