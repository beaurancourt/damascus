import { Button, Flex, Popover, Space, Tag } from 'antd';
import { HeartFilled, PlusOutlined } from '@ant-design/icons';
import { Collections } from '@/utils/collections';
import { ConditionLogic } from '@/logic/condition-logic';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Format } from '@/utils/format';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Monster } from '@/models/monster';
import { MonsterInfo } from '@/components/panels/token/token';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterOrganizationType } from '@/enums/monster-organization-type';
import { Utils } from '@/utils/utils';

import './controlled-monsters-panel.scss';

interface Props {
	hero: Hero;
	onAddSquad: (hero: Hero, monster: Monster, count: number) => void;
	onRemoveSquad: (hero: Hero, slotID: string) => void;
	onRemoveMonsterFromSquad: (hero: Hero, slotID: string, monsterID: string) => void;
	onAddMonsterToSquad: (hero: Hero, slotID: string) => void;
	onSelectControlledMonster: (hero: Hero, monster: Monster) => void;
	onSelectControlledSquad: (hero: Hero, slot: EncounterSlot) => void;
	onUpdateSquad: (hero: Hero, slot: EncounterSlot) => void;
}

export const ControlledMonstersPanel = (props: Props) => {
	const companions = HeroLogic.getCompanions(props.hero);
	const retainers = HeroLogic.getRetainers(props.hero);
	const summons = HeroLogic.getSummons(props.hero);

	const canAdd = (companions.length + retainers.length + summons.length) > 0;

	// Squads already being tracked keep the panel on screen even when the hero
	// has nothing left to summon. The guard used to ask only what could be
	// added, so changing class - or clearing a summon choice - hid squads that
	// were still in the hero's saved state: invisible, and impossible to delete.
	if (!canAdd && (props.hero.state.controlledSlots.length === 0)) {
		return null;
	}

	const getAddBtn = () => {
		return (
			<Popover
				trigger='click'
				content={
					<Space orientation='vertical' style={{ width: '100%' }}>
						{
							companions.map(m => (
								<Button
									key={m.id}
									type='text'
									block={true}
									onClick={e => {
										e.stopPropagation();
										props.onAddSquad(props.hero, m, 1);
									}}
								>
									Companion: {m.name}
								</Button>
							))
						}
						{
							retainers.map(m => (
								<Button
									key={m.id}
									type='text'
									block={true}
									onClick={e => {
										e.stopPropagation();
										props.onAddSquad(props.hero, m, 1);
									}}
								>
									Retainer: {m.name}
								</Button>
							))
						}
						{
							summons.map(m => (
								<Button
									key={m.id}
									type='text'
									block={true}
									onClick={e => {
										e.stopPropagation();
										props.onAddSquad(props.hero, m.monster, m.info.count);
									}}
								>
									{m.info.count === 1 ? `Summon: ${m.name}` : `Summon: ${m.name} (x${m.info.count})`}
								</Button>
							))
						}
					</Space>
				}
			>
				<Button block={true}>
					<PlusOutlined />
					Track Retinue Stats
				</Button>
			</Popover>
		);
	};

	// One creature's Stamina, not its squad's: a skeleton that takes a hit is the
	// only one hurt by it. 1 and 5 are the amounts you reach for mid-turn, and
	// they're right on the row - no drawer in the way.
	const adjustMinion = (slot: EncounterSlot, monsterID: string, delta: number) => {
		const copy = Utils.copy(slot);

		const monster = copy.monsters.find(m => m.id === monsterID);
		if (!monster) {
			return;
		}

		if (delta < 0) {
			const damage = -delta;
			const damageToTemp = Math.min(damage, monster.state.staminaTemp);
			monster.state.staminaTemp -= damageToTemp;

			// Clamped at this creature's Stamina: these are tap-happy buttons, and
			// damage banked past dead would have to be healed back before the
			// number moved again.
			const max = MonsterLogic.getStamina(monster);
			monster.state.staminaDamage = Math.min(monster.state.staminaDamage + (damage - damageToTemp), max);
		} else {
			monster.state.staminaDamage = Math.max(monster.state.staminaDamage - delta, 0);
		}

		// The squad's pool is what its minions have taken between them, so the
		// Squad Stamina row and its drawer keep agreeing with the rows.
		copy.state.staminaDamage = Collections.sum(copy.monsters, m => m.state.staminaDamage);

		props.onUpdateSquad(props.hero, copy);
	};

	const getSlot = (slot: EncounterSlot) => {
		const isMinionSlot = slot.monsters.every(m => m.role.organization === MonsterOrganizationType.Minion);
		const isRetainerSlot = slot.monsters.every(m => m.role.organization === MonsterOrganizationType.Retainer);
		const isCompanionSlot = !isMinionSlot && !isRetainerSlot;

		const getMonster = (m: Monster) => {
			const tags: string[] = [];
			if (![ 'healthy', 'injured' ].includes(MonsterLogic.getCombatState(m))) {
				tags.push(Format.capitalize(MonsterLogic.getCombatState(m)));
			}
			if (m.state.hidden) {
				tags.push('Hidden');
			}
			tags.push(...m.state.conditions.map(c => ConditionLogic.getFullDescription(c)));

			return (
				<div key={m.id} className='controlled-monster' onClick={() => props.onSelectControlledMonster(props.hero, m)}>
					{/* A small basis, so name, controls and delete stay on one line
					    even on a narrow phone - the name gets whatever slack is
					    left, and truncates rather than pushing anything off. */}
					<Space orientation='vertical' style={{ flex: isMinionSlot ? '1 1 50px' : '1 1 120px', minWidth: 0 }}>
						<Flex align='center' justify='space-between' gap={5}>
							{
								isMinionSlot ?
									// Its level and role are on the stat block a tap away, and
									// they're the same for every minion in the squad.
									<div className='controlled-monster-name'>{m.name}</div>
									: <MonsterInfo monster={m} />
							}
							{
								!isMinionSlot ?
									<Flex gap={5}>
										{MonsterLogic.getStaminaDescription(m)}
										<HeartFilled style={{ color: 'rgb(200, 0, 0)' }} />
									</Flex>
									: null
							}
						</Flex>
						{
							tags.length > 0 ?
								<Flex gap={3}>
									{tags.map((tag, n) => <Tag key={n} variant='outlined'>{tag}</Tag>)}
								</Flex>
								: null
						}
					</Space>
					{/* This creature's own Stamina. stopPropagation so a tap doesn't
					    also open its stat block. */}
					{
						isMinionSlot ?
							<div className='controlled-monster-health' onClick={e => e.stopPropagation()}>
								<Button size='small' title='Take 5 damage' onClick={() => adjustMinion(slot, m.id, -5)}>-5</Button>
								<Button size='small' title='Take 1 damage' onClick={() => adjustMinion(slot, m.id, -1)}>-1</Button>
								<div className='controlled-monster-stamina'>{MonsterLogic.getStaminaDescription(m)}</div>
								<Button size='small' title='Regain 1 Stamina' onClick={() => adjustMinion(slot, m.id, 1)}>+1</Button>
								<Button size='small' title='Regain 5 Stamina' onClick={() => adjustMinion(slot, m.id, 5)}>+5</Button>
							</div>
							: null
					}
					{/* This one creature, not its squad - a summoner loses skeletons
					    one at a time. stopPropagation so it doesn't also open the
					    creature's stat block on the way past. */}
					<div className='controlled-monster-remove' onClick={e => e.stopPropagation()}>
						<DangerButton
							mode='clear'
							onConfirm={() => props.onRemoveMonsterFromSquad(props.hero, slot.id, m.id)}
						/>
					</div>
				</div>
			);
		};

		return (
			<Space key={slot.id} className='controlled-slot' orientation='vertical' style={{ width: '100%' }}>
				<Flex align='center' style={{ paddingLeft: '5px' }}>
					<b style={{ flex: '1 1 0' }}>
						{isCompanionSlot ? 'Companion' : ''}
						{isRetainerSlot ? 'Retainer' : ''}
						{isMinionSlot ? 'Minion Squad' : ''}
					</b>
					<Button type='text' title='Add Another' icon={<PlusOutlined />} onClick={() => props.onAddMonsterToSquad(props.hero, slot.id)} />
					<DangerButton mode='clear' onConfirm={() => props.onRemoveSquad(props.hero, slot.id)} />
				</Flex>
				{
					isMinionSlot ?
						<div className='controlled-monster' onClick={() => props.onSelectControlledSquad(props.hero, slot)}>
							<Flex align='center' justify='space-between' style={{ width: '100%' }}>
								<b>Squad Stamina</b>
								<Flex gap={5}>
									{MonsterLogic.getMinionStaminaDescription(slot)}
									<HeartFilled style={{ color: 'rgb(200, 0, 0)' }} />
								</Flex>
							</Flex>
						</div>
						: null
				}
				{slot.monsters.map(getMonster)}
				{slot.monsters.length === 0 ? <div>Empty</div> : null}
			</Space>
		);
	};

	return (
		<ErrorBoundary>
			<div className='controlled-monsters-panel'>
				{canAdd ? getAddBtn() : null}
				{props.hero.state.controlledSlots.map(getSlot)}
			</div>
		</ErrorBoundary>
	);
};
