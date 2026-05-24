import { Flex, Tag } from 'antd';
import { ConditionLogic } from '@/logic/condition-logic';
import { ConditionType } from '@/enums/condition-type';
import { ControlledMonstersPanel } from '@/components/panels/hero/controlled-monsters/controlled-monsters-panel';
import { DamageModifierType } from '@/enums/damage-modifier-type';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroModalType } from '@/enums/hero-modal-type';
import { Markdown } from '@/components/controls/markdown/markdown';
import { Monster } from '@/models/monster';
import { Pill } from '@/components/controls/pill/pill';
import { RulesPage } from '@/enums/rules-page';
import { Skill } from '@/models/skill';
import { SkillList } from '@/enums/skill-list';
import { Sourcebook } from '@/models/sourcebook';
import { useOptions } from '@/contexts/data-context';

import './sidebar-panel.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onShowState: (type: HeroModalType) => void;
	onShowReference: (page: RulesPage) => void;
	onAddSquad: (hero: Hero, monster: Monster, count: number) => void;
	onRemoveSquad: (hero: Hero, slotID: string) => void;
	onAddMonsterToSquad: (hero: Hero, slotID: string) => void;
	onSelectControlledMonster: (hero: Hero, monster: Monster) => void;
	onSelectControlledSquad: (hero: Hero, slot: EncounterSlot) => void;
}

export const SidebarPanel = (props: Props) => {
	const options = useOptions();
	const onShowStats = () => {
		if (props.onShowState) {
			props.onShowState(HeroModalType.Resources);
		}
	};

	const onShowConditions = () => {
		if (props.onShowReference) {
			props.onShowReference(RulesPage.Conditions);
		}
	};

	const onShowSkills = () => {
		if (props.onShowReference) {
			props.onShowReference(RulesPage.Skills);
		}
	};

	const onShowLanguages = () => {
		if (props.onShowReference) {
			props.onShowReference(RulesPage.Languages);
		}
	};

	const conditionImmunities = HeroLogic.getConditionImmunities(props.hero);
	const damageModifiers = HeroLogic.getDamageModifiers(props.hero);
	const damageImmunities = damageModifiers.filter(dm => dm.modifierType === DamageModifierType.Immunity);
	const damageWeaknesses = damageModifiers.filter(dm => dm.modifierType === DamageModifierType.Weakness);

	const heroicResources = HeroLogic.getHeroicResources(props.hero);
	const languages = HeroLogic.getLanguages(props.hero, props.sourcebooks);

	const useRows = options.singlePage && options.compactView;

	const getSkills = (label: string, skills: Skill[]) => {
		return skills.length > 0 ?
			useRows ?
				<div className='selectable-row clickable' onClick={onShowSkills}>
					<div>{label}: <b>{skills.map(s => s.name).join(', ')}</b></div>
				</div>
				:
				<div key={label} className='overview-tile clickable' onClick={onShowSkills}>
					<HeaderText>{label}</HeaderText>
					{
						skills.map(s => (
							<div key={s.name} className='ds-text'>
								{s.name} {options.showSkillsInGroups ? null : <Tag variant='outlined'>{s.list}</Tag>}
							</div>
						))
					}
				</div>
			: null;
	};

	let display = 'column';
	if (options.singlePage) {
		display = 'grid';
	}
	if (useRows) {
		display = 'list';
	}

	return (
		<ErrorBoundary>
			<div className={`hero-sidebar ${display}`}>
				{
					HeroLogic.getCombatState(props.hero) === 'dying' ?
						useRows ?
							<div className='selectable-row danger'>
								<div><b>Dying</b></div>
							</div>
							:
							<div className='overview-tile danger'>
								<HeaderText>Dying</HeaderText>
								<div className='ds-text'>
									You can’t take the Catch Breath maneuver in combat, and you are bleeding, and this condition can’t be removed in any way until you are no longer dying.
								</div>
								<div className='ds-text'>
									Your allies can help you spend Recoveries in combat, and you can spend Recoveries out of combat as usual.
								</div>
							</div>
						: null
				}
				{
					props.hero.state.conditions.map(c =>
						useRows ?
							<div key={c.id} className='selectable-row warning'>
								<div>Condition: <b>{c.type === ConditionType.Custom ? c.text || 'A custom condition.' : ConditionLogic.getDescription(c.type)}</b></div>
							</div>
							:
							<div key={c.id} className='overview-tile warning'>
								<HeaderText tags={[ c.ends ]}>{c.type}</HeaderText>
								<Markdown text={c.type === ConditionType.Custom ? c.text || 'A custom condition.' : ConditionLogic.getDescription(c.type)} />
							</div>
					)
				}
				{
					(heroicResources.length > 0) && !options.singlePage ?
						<>
							{
								heroicResources.map(hr =>
									useRows ?
										<div key={hr.id} className={hr.value >= 0 ? 'selectable-row clickable' : 'selectable-row warning clickable'} onClick={onShowStats}>
											<div>Resource: <b>{hr.name}</b></div>
											<div>{hr.value}</div>
										</div>
										:
										<div key={hr.id} className={hr.value >= 0 ? 'overview-tile clickable' : 'overview-tile warning clickable'} onClick={onShowStats}>
											<HeaderText
												extra={<div style={{ fontSize: '16px', fontWeight: '600' }}>{hr.value}</div>}
											>
												{hr.name}
											</HeaderText>
											{
												hr.gains.map((g, n) => (
													<Flex key={n} align='center' justify='space-between' gap={10}>
														<div className='ds-text compact-text'>{g.trigger}</div>
														<Pill>+{g.value}</Pill>
													</Flex>
												))
											}
										</div>
								)
							}
						</>
						: null
				}
				<ControlledMonstersPanel
					hero={props.hero}
					onAddSquad={props.onAddSquad!}
					onRemoveSquad={props.onRemoveSquad!}
					onAddMonsterToSquad={props.onAddMonsterToSquad!}
					onSelectControlledMonster={props.onSelectControlledMonster!}
					onSelectControlledSquad={props.onSelectControlledSquad!}
				/>
				{
					conditionImmunities.length > 0 ?
						useRows ?
							<div className='selectable-row clickable' onClick={onShowConditions}>
								<div>Cannot Be: <b>{conditionImmunities.join(', ')}</b></div>
							</div>
							:
							<div className='overview-tile clickable' onClick={onShowConditions}>
								<HeaderText>Cannot Be</HeaderText>
								{conditionImmunities.map((c, n) => <div key={n} className='ds-text'>{c}</div>)}
							</div>
						: null
				}
				{
					damageImmunities.length > 0 ?
						useRows ?
							<div className='selectable-row'>
								<div>Immunities: <b>{damageImmunities.map(dm => `${dm.damageType} ${dm.value}`).join(', ')}</b></div>
							</div>
							:
							<div className='overview-tile'>
								<HeaderText>Immunities</HeaderText>
								{damageImmunities.map((dm, n) => <div key={n} className='ds-text damage-modifier'><span>{dm.damageType}</span><span>{dm.value}</span></div>)}
							</div>
						: null
				}
				{
					damageWeaknesses.length > 0 ?
						useRows ?
							<div className='selectable-row'>
								<div>Weaknesses: <b>{damageWeaknesses.map(dm => `${dm.damageType} ${dm.value}`).join(', ')}</b></div>
							</div>
							:
							<div className='overview-tile'>
								<HeaderText>Weaknesses</HeaderText>
								{damageWeaknesses.map((dm, n) => <div key={n} className='ds-text damage-modifier'><span>{dm.damageType}</span><span>{dm.value}</span></div>)}
							</div>
						: null
				}
				{
					useRows ?
						<div className='selectable-row clickable' onClick={onShowLanguages}>
							<div>Languages: <b>{languages.map(l => l.name).join(', ')}</b></div>
						</div>
						:
						<div className='overview-tile clickable' onClick={onShowLanguages}>
							<HeaderText>Languages</HeaderText>
							{
								languages.length > 0 ?
									languages.map(l => <div key={l.name} className='ds-text'>{l.name}</div>)
									:
									<div className='ds-text dimmed-text'>None</div>
							}
						</div>
				}
				{
					(options.showSkillsInGroups || false) ?
						[ SkillList.Crafting, SkillList.Exploration, SkillList.Interpersonal, SkillList.Intrigue, SkillList.Lore, SkillList.Custom ]
							.map(list => getSkills(`${list} Skills`, HeroLogic.getSkills(props.hero, props.sourcebooks).filter(s => s.list === list)))
						:
						getSkills('Skills', HeroLogic.getSkills(props.hero, props.sourcebooks))
				}
			</div>
		</ErrorBoundary>
	);
};
