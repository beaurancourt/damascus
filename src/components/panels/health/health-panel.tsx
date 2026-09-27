import { Alert, Button, Flex, InputNumber, Popover, Segmented, Space, Tag } from 'antd';
import { ConditionEndType, ConditionType } from '@/enums/condition-type';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Collections } from '@/utils/collections';
import { Condition } from '@/models/condition';
import { ConditionLogic } from '@/logic/condition-logic';
import { ConditionPanel } from '@/components/panels/condition/condition-panel';
import { DamageModifierType } from '@/enums/damage-modifier-type';
import { DropdownButton } from '@/components/controls/dropdown-button/dropdown-button';
import { Empty } from '@/components/controls/empty/empty';
import { Encounter } from '@/models/encounter';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Field } from '@/components/controls/field/field';
import { Format } from '@/utils/format';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { HealthBars } from '@/components/panels/health-bars/health-bars';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Markdown } from '@/components/controls/markdown/markdown';
import { Monster } from '@/models/monster';
import { MonsterInfo } from '@/components/panels/token/token';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterOrganizationType } from '@/enums/monster-organization-type';
import { PanelMode } from '@/enums/panel-mode';
import { Utils } from '@/utils/utils';

import './health-panel.scss';

interface HeroProps {
	hero: Hero;
	showEncounterControls: boolean;
	sections?: ('stamina' | 'conditions')[];
	onChange?: (hero: Hero) => void;
}

export const HeroHealthPanel = (props: HeroProps) => {
	const [ hero, setHero ] = useState<Hero>(Utils.copy(props.hero));

	// Sync local copy when the source hero changes (important for inline mounts that outlive a single edit)
	useEffect(() => {
		setHero(Utils.copy(props.hero));
	}, [ props.hero ]);

	// Stamina damage and temporary stamina move together. Taking damage eats
	// temporary stamina first, so putting the creature back the way it was is a
	// single write: two setters would each rebuild it from the numbers the other
	// has not written yet, and the second call would undo the first.
	const restoreStamina = (damage: number, temp: number) => {
		const copy = Utils.copy(hero);
		copy.state.staminaDamage = damage;
		copy.state.staminaTemp = temp;
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setRecoveriesUsed = (value: number) => {
		const copy = Utils.copy(hero);
		copy.state.recoveriesUsed = value;
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const takeDamage = (value: number) => {
		const damageToTemp = Math.min(value, hero.state.staminaTemp);
		const damageToStamina = value - damageToTemp;

		const copy = Utils.copy(hero);
		copy.state.staminaDamage += damageToStamina;
		copy.state.staminaTemp -= damageToTemp;
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const heal = (value: number) => {
		const copy = Utils.copy(hero);
		copy.state.staminaDamage = Math.max(hero.state.staminaDamage - value, 0);
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const addTemp = (value: number) => {
		const copy = Utils.copy(hero);
		copy.state.staminaTemp = hero.state.staminaTemp + value;
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const spendRecovery = () => {
		const recoveryValue = HeroLogic.getRecoveryValue(hero);

		const copy = Utils.copy(hero);
		copy.state.recoveriesUsed += 1;
		copy.state.staminaDamage = Math.max(copy.state.staminaDamage - recoveryValue, 0);
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setHidden = (value: boolean) => {
		const copy = Utils.copy(hero);
		copy.state.hidden = value;
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setDefeated = (value: boolean) => {
		const copy = Utils.copy(hero);
		copy.state.defeated = value;
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const addCondition = (condition: Condition) => {
		const copy = Utils.copy(hero);
		copy.state.conditions.push(condition);
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const editCondition = (condition: Condition) => {
		const copy = Utils.copy(hero);
		const index = copy.state.conditions.findIndex(c => c.id === condition.id);
		if (index !== -1) {
			copy.state.conditions[index] = condition;
			setHero(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		}
	};

	const deleteCondition = (condition: Condition) => {
		const copy = Utils.copy(hero);
		copy.state.conditions = copy.state.conditions.filter(c => c.id !== condition.id);
		setHero(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	return (
		<ErrorBoundary>
			<HealthPanel
				mode={props.onChange ? PanelMode.Full : PanelMode.Compact}
				showToggles={props.showEncounterControls}
				sections={props.sections}
				stamina={
					HeroLogic.getStamina(hero) !== 0 ?
						{
							staminaMax: HeroLogic.getStamina(hero),
							staminaDamage: hero.state.staminaDamage,
							state: HeroLogic.getCombatState(hero),
							immunities: HeroLogic.getDamageModifiers(hero).filter(dm => dm.modifierType === DamageModifierType.Immunity),
							weaknesses: HeroLogic.getDamageModifiers(hero).filter(dm => dm.modifierType === DamageModifierType.Weakness),
							restore: restoreStamina,
							takeDamage: takeDamage,
							heal: heal
						}
						: undefined
				}
				staminaTemp={{
					staminaTemp: hero.state.staminaTemp,
					addTemp: addTemp
				}}
				recoveries={{
					recoveriesMax: HeroLogic.getRecoveries(hero),
					recoveriesUsed: hero.state.recoveriesUsed,
					recoveryValue: HeroLogic.getRecoveryValue(hero),
					setValue: setRecoveriesUsed,
					spendRecovery: spendRecovery
				}}
				hidden={{
					value: hero.state.hidden,
					setValue: setHidden
				}}
				defeated={{
					value: hero.state.defeated,
					setValue: setDefeated
				}}
				conditions={{
					current: hero.state.conditions,
					immunities: HeroLogic.getConditionImmunities(hero)
				}}
				addCondition={addCondition}
				editCondition={editCondition}
				deleteCondition={deleteCondition}
			/>
		</ErrorBoundary>
	);
};

interface MonsterProps {
	monster: Monster;
	onChange?: (monster: Monster) => void;
}

export const MonsterHealthPanel = (props: MonsterProps) => {
	const [ monster, setMonster ] = useState<Monster>(Utils.copy(props.monster));

	// Stamina damage and temporary stamina move together. Taking damage eats
	// temporary stamina first, so putting the creature back the way it was is a
	// single write: two setters would each rebuild it from the numbers the other
	// has not written yet, and the second call would undo the first.
	const restoreStamina = (damage: number, temp: number) => {
		const copy = Utils.copy(monster);
		copy.state.staminaDamage = damage;
		copy.state.staminaTemp = temp;
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const takeDamage = (value: number) => {
		const damageToTemp = Math.min(value, monster.state.staminaTemp);
		const damageToStamina = value - damageToTemp;

		const copy = Utils.copy(monster);
		copy.state.staminaDamage += damageToStamina;
		copy.state.staminaTemp -= damageToTemp;
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const heal = (value: number) => {
		const copy = Utils.copy(monster);
		copy.state.staminaDamage = Math.max(monster.state.staminaDamage - value, 0);
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const addTemp = (value: number) => {
		const copy = Utils.copy(monster);
		copy.state.staminaTemp = monster.state.staminaTemp + value;
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setRecoveriesUsed = (value: number) => {
		const copy = Utils.copy(monster);
		copy.state.recoveriesUsed = value;
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const spendRecovery = () => {
		const recoveryValue = Math.floor(MonsterLogic.getStamina(monster) / 3);

		const copy = Utils.copy(monster);
		if (copy.state.recoveriesUsed === undefined) {
			copy.state.recoveriesUsed = 0;
		}
		copy.state.recoveriesUsed += 1;
		copy.state.staminaDamage = Math.max(copy.state.staminaDamage - recoveryValue, 0);
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setHidden = (value: boolean) => {
		const copy = Utils.copy(monster);
		copy.state.hidden = value;
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setDefeated = (value: boolean) => {
		const copy = Utils.copy(monster);
		copy.state.defeated = value;
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const addCondition = (condition: Condition) => {
		const copy = Utils.copy(monster);
		copy.state.conditions.push(condition);
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const editCondition = (condition: Condition) => {
		const copy = Utils.copy(monster);
		const index = copy.state.conditions.findIndex(c => c.id === condition.id);
		if (index !== -1) {
			copy.state.conditions[index] = condition;
			setMonster(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		}
	};

	const deleteCondition = (condition: Condition) => {
		const copy = Utils.copy(monster);
		copy.state.conditions = copy.state.conditions.filter(c => c.id !== condition.id);
		setMonster(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	return (
		<ErrorBoundary>
			<HealthPanel
				mode={props.onChange ? PanelMode.Full : PanelMode.Compact}
				showToggles={true}
				stamina={
					monster.role.organization !== MonsterOrganizationType.Minion ?
						{
							staminaMax: MonsterLogic.getStamina(monster),
							staminaDamage: monster.state.staminaDamage,
							state: MonsterLogic.getCombatState(monster),
							immunities: MonsterLogic.getDamageModifiers(monster).filter(dm => dm.modifierType === DamageModifierType.Immunity),
							weaknesses: MonsterLogic.getDamageModifiers(monster).filter(dm => dm.modifierType === DamageModifierType.Weakness),
							restore: restoreStamina,
							takeDamage: takeDamage,
							heal: heal
						}
						: undefined
				}
				staminaTemp={
					monster.role.organization !== MonsterOrganizationType.Minion ?
						{
							staminaTemp: monster.state.staminaTemp,
							addTemp: addTemp
						}
						: undefined
				}
				recoveries={
					monster.role.organization === MonsterOrganizationType.Retainer ?
						{
							recoveriesMax: 6,
							recoveriesUsed: monster.state.recoveriesUsed || 0,
							recoveryValue: Math.floor(MonsterLogic.getStamina(monster) / 3),
							setValue: setRecoveriesUsed,
							spendRecovery: spendRecovery
						}
						: undefined
				}
				hidden={{
					value: monster.state.hidden,
					setValue: setHidden
				}}
				defeated={{
					value: monster.state.defeated,
					setValue: setDefeated
				}}
				conditions={{
					current: monster.state.conditions,
					immunities: MonsterLogic.getConditionImmunities(monster)
				}}
				addCondition={addCondition}
				editCondition={editCondition}
				deleteCondition={deleteCondition}
			/>
		</ErrorBoundary>
	);
};

interface MinionGroupProps {
	slot: EncounterSlot;
	encounter?: Encounter;
	onChange?: (slot: EncounterSlot) => void;
}

export const MinionGroupHealthPanel = (props: MinionGroupProps) => {
	const [ slot, setSlot ] = useState<EncounterSlot>(Utils.copy(props.slot));

	// Stamina damage and temporary stamina move together. Taking damage eats
	// temporary stamina first, so putting the creature back the way it was is a
	// single write: two setters would each rebuild it from the numbers the other
	// has not written yet, and the second call would undo the first.
	const restoreStamina = (damage: number, temp: number) => {
		const copy = Utils.copy(slot);
		copy.state.staminaDamage = damage;
		copy.state.staminaTemp = temp;
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const takeDamage = (value: number) => {
		const damageToTemp = Math.min(value, slot.state.staminaTemp);
		const damageToStamina = value - damageToTemp;

		const copy = Utils.copy(slot);
		copy.state.staminaDamage += damageToStamina;
		copy.state.staminaTemp -= damageToTemp;
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const heal = (value: number) => {
		const copy = Utils.copy(slot);
		copy.state.staminaDamage = Math.max(copy.state.staminaDamage - value, 0);
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setDefeated = (value: boolean) => {
		const copy = Utils.copy(slot);
		copy.state.defeated = value;
		if (value) {
			// If the group is defeated, all minions are defeated
			copy.monsters.forEach(m => m.state.defeated = true);
		}
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const setCaptainID = (value: string | undefined) => {
		const copy = Utils.copy(slot);
		copy.state.captainID = value;
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const addCondition = (condition: Condition) => {
		const copy = Utils.copy(slot);
		copy.state.conditions.push(condition);
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	const editCondition = (condition: Condition) => {
		const copy = Utils.copy(slot);
		const index = copy.state.conditions.findIndex(c => c.id === condition.id);
		if (index !== -1) {
			copy.state.conditions[index] = condition;
			setSlot(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		}
	};

	const deleteCondition = (condition: Condition) => {
		const copy = Utils.copy(slot);
		copy.state.conditions = copy.state.conditions.filter(c => c.id !== condition.id);
		setSlot(copy);
		if (props.onChange) {
			props.onChange(copy);
		}
	};

	return (
		<ErrorBoundary>
			<HealthPanel
				mode={props.onChange ? PanelMode.Full : PanelMode.Compact}
				showToggles={true}
				stamina={{
					staminaMax: Collections.sum(props.slot.monsters, m => MonsterLogic.getStamina(m)),
					staminaDamage: slot.state.staminaDamage,
					state: 'healthy',
					immunities: [],
					weaknesses: [],
					restore: restoreStamina,
					takeDamage: takeDamage,
					heal: heal
				}}
				defeated={{
					value: slot.state.defeated,
					setValue: setDefeated
				}}
				captain={
					props.encounter ?
						{
							captainID: slot.state.captainID,
							candidates: props.encounter.groups
								.flatMap(g => g.slots)
								.flatMap(s => s.monsters)
								.filter(m => m.role.organization !== MonsterOrganizationType.Minion)
								.filter(m => !m.state.defeated),
							setCaptainID: setCaptainID
						}
						: undefined
				}
				conditions={{
					current: slot.state.conditions,
					immunities: []
				}}
				addCondition={addCondition}
				editCondition={editCondition}
				deleteCondition={deleteCondition}
			/>
		</ErrorBoundary>
	);
};

interface Props {
	mode: PanelMode;
	showToggles: boolean;
	sections?: ('stamina' | 'conditions')[];
	stamina?: {
		staminaMax: number;
		staminaDamage: number;
		state: string;
		immunities: { damageType: string, value: number }[];
		weaknesses: { damageType: string, value: number }[];
		restore: (staminaDamage: number, staminaTemp: number) => void;
		takeDamage: (value: number) => void;
		heal: (value: number) => void;
	};
	staminaTemp?: {
		staminaTemp: number;
		addTemp: (value: number) => void;
	}
	recoveries?: {
		recoveriesMax: number;
		recoveriesUsed: number;
		recoveryValue: number;
		setValue: (value: number) => void;
		spendRecovery: () => void;
	}
	hidden?: {
		value: boolean;
		setValue: (value: boolean) => void;
	};
	defeated?: {
		value: boolean;
		setValue: (value: boolean) => void;
	};
	captain?: {
		captainID: string | undefined;
		candidates: Monster[];
		setCaptainID: (value: string | undefined) => void;
	};
	conditions: {
		current: Condition[];
		immunities: ConditionType[];
	};
	addCondition: (condition: Condition) => void;
	editCondition: (condition: Condition) => void;
	deleteCondition: (condition: Condition) => void;
}

const HealthPanel = (props: Props) => {
	// null while the field is empty, which is where it starts and where it returns
	// after each action: backspacing clears it instead of snapping back to 0, and
	// nothing is entered by default. An empty field has nothing to apply.
	const [ damageValue, setDamageValue ] = useState<number | null>(null);
	const amount = damageValue ?? 0;
	const [ addConditionOpen, setAddConditionOpen ] = useState<boolean>(false);

	// What the last quick step undid, and the numbers to put back. Taking damage
	// eats temporary stamina first, and healing floors at 0, so an undo cannot be
	// the same step in reverse - it restores the numbers that were there before.
	const [ undo, setUndo ] = useState<{ label: string, staminaDamage: number, staminaTemp: number } | null>(null);

	const step = (value: number) => {
		if (!props.stamina || (value === 0)) {
			return;
		}

		const before = {
			staminaDamage: props.stamina.staminaDamage,
			staminaTemp: props.staminaTemp ? props.staminaTemp.staminaTemp : 0
		};

		if (value > 0) {
			const healed = Math.min(value, before.staminaDamage);
			if (healed === 0) {
				return;
			}
			props.stamina.heal(healed);
			setUndo({ label: `Regained ${healed} Stamina`, ...before });
		} else {
			props.stamina.takeDamage(-value);
			setUndo({ label: `Took ${-value} damage`, ...before });
		}
		setDamageValue(null);
	};

	const undoStep = () => {
		if (!undo) {
			return;
		}
		props.stamina?.restore(undo.staminaDamage, undo.staminaTemp);
		setUndo(null);
	};

	useEffect(() => {
		// No dependency list on purpose: the handler closes over the props and the
		// undo record, so it is rebuilt on every render rather than holding a stale
		// copy of the creature's numbers.
		const onKeyDown = (e: KeyboardEvent) => {
			if (!undo || !(e.metaKey || e.ctrlKey) || (e.key.toLowerCase() !== 'z')) {
				return;
			}
			const target = e.target as HTMLElement | null;
			if (target && ((target.tagName === 'INPUT') || (target.tagName === 'TEXTAREA') || target.isContentEditable)) {
				// Somewhere else is doing its own undo.
				return;
			}
			e.preventDefault();
			undoStep();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});

	const takeDamage = () => {
		if (props.stamina) {
			props.stamina.takeDamage(amount);
		}
		setDamageValue(null);
		setUndo(null);
	};

	const heal = () => {
		if (props.stamina) {
			props.stamina.heal(amount);
		}
		setDamageValue(null);
		setUndo(null);
	};

	const addTemp = () => {
		if (props.staminaTemp) {
			props.staminaTemp.addTemp(amount);
		}
		setDamageValue(null);
		setUndo(null);
	};

	const addCondition = (type: ConditionType) => {
		setAddConditionOpen(false);
		props.addCondition({
			id: Utils.guid(),
			type: type,
			text: '',
			ends: ConditionEndType.UntilRemoved
		});
	};

	const addSpecial = (text: string) => {
		props.addCondition({
			id: Utils.guid(),
			type: ConditionType.Quick,
			text: text,
			ends: ConditionEndType.UntilRemoved
		});
	};

	const conditionTypes: ConditionType[] = [
		ConditionType.Custom,
		ConditionType.Bleeding,
		ConditionType.Dazed,
		ConditionType.Frightened,
		ConditionType.Grabbed,
		ConditionType.Prone,
		ConditionType.Restrained,
		ConditionType.Slowed,
		ConditionType.Taunted,
		ConditionType.Weakened
	];

	const getHealthControls = () => {
		return (
			<Space orientation='vertical' style={{ flex: '1 1 0', width: '100%' }}>
				{
					props.stamina ?
						<>
							<div className='stamina-steps'>
								<Button className='quick-step' title='Take 5 damage' onClick={() => step(-5)}>
									<div>−5</div>
									<div className='step-label'>Take</div>
								</Button>
								<Button className='quick-step' title='Take 1 damage' onClick={() => step(-1)}>
									<div>−1</div>
									<div className='step-label'>Take</div>
								</Button>
								<InputNumber
									className='stamina-amount'
									min={0}
									controls={false}
									value={damageValue}
									onChange={value => setDamageValue(value === null ? null : Math.round(value))}
									onPressEnter={() => takeDamage()}
								/>
								<Button
									className='quick-step'
									title={props.stamina.staminaDamage > 0 ? 'Regain 1 Stamina' : 'Nothing to regain'}
									disabled={props.stamina.staminaDamage === 0}
									onClick={() => step(1)}
								>
									<div>+1</div>
									<div className='step-label'>Regain</div>
								</Button>
								<Button
									className='quick-step'
									title={props.stamina.staminaDamage > 0 ? 'Regain 5 Stamina' : 'Nothing to regain'}
									disabled={props.stamina.staminaDamage === 0}
									onClick={() => step(5)}
								>
									<div>+5</div>
									<div className='step-label'>Regain</div>
								</Button>
							</div>
							{
								undo ?
									<Button block={true} className='undo-button' title='Undo (Cmd+Z or Ctrl+Z)' onClick={undoStep}>
										<span>{undo.label}</span>
										<span className='undo-action'>Undo</span>
									</Button>
									: null
							}
							<Button block={true} disabled={amount === 0} onClick={takeDamage}>Take Damage</Button>
							<Button block={true} disabled={amount === 0} onClick={heal}>Regain Stamina</Button>
							{props.staminaTemp ? <Button block={true} disabled={amount === 0} onClick={addTemp}>Add Temporary Stamina</Button> : null}
						</>
						: null
				}
				{
					props.recoveries ?
						<>
							<Button
								block={true}
								className='tall-button'
								disabled={!props.stamina || (props.stamina.staminaDamage === 0) || (props.recoveries.recoveriesUsed >= props.recoveries.recoveriesMax)}
								onClick={() => { setUndo(null); props.recoveries!.spendRecovery(); }}
							>
								<div>
									<div>Spend a Recovery</div>
									<div className='subtext'>
										Regain up to {props.recoveries.recoveryValue} Stamina
									</div>
								</div>
							</Button>
							<Button
								block={true}
								className='tall-button'
								disabled={props.recoveries.recoveriesUsed >= props.recoveries.recoveriesMax}
								onClick={() => { setUndo(null); props.recoveries!.setValue(props.recoveries!.recoveriesUsed + 1); }}
							>
								<div>
									<div>Spend a Recovery</div>
									<div className='subtext'>
										Don't regain Stamina
									</div>
								</div>
							</Button>
							<Button
								block={true}
								disabled={props.recoveries.recoveriesUsed === 0}
								onClick={() => { setUndo(null); props.recoveries!.setValue(props.recoveries!.recoveriesUsed - 1); }}
							>
								Regain a Recovery
							</Button>
						</>
						: null
				}
			</Space>
		);
	};

	if (props.mode === PanelMode.Compact) {
		const tags: string[] = [];
		if (props.defeated && props.defeated.value) {
			tags.push('Defeated');
		} else {
			if (props.stamina && ![ 'healthy', 'injured' ].includes(props.stamina.state)) {
				tags.push(Format.capitalize(props.stamina.state));
			}
			if (props.hidden && props.hidden.value) {
				tags.push('Hidden');
			}
			if (props.captain && props.captain.captainID) {
				const captain = props.captain.candidates.find(m => m.id === props.captain!.captainID);
				if (captain) {
					tags.push(captain.name);
				}
			}
			props.conditions.current.forEach(c => {
				tags.push(c.type === ConditionType.Quick ? c.text : c.type);
			});
		}

		return (
			<ErrorBoundary>
				<div className='health-panel compact'>
					{
						props.stamina ?
							<Field
								label='Stamina'
								value={props.stamina.staminaDamage ? `${props.stamina!.staminaMax - props.stamina!.staminaDamage} / ${props.stamina!.staminaMax}` : props.stamina!.staminaMax}
							/>
							: null
					}
					{
						tags.length > 0 ?
							<Flex gap={3}>{tags.map((tag, n) => <Tag key={n} variant='outlined'>{tag}</Tag>)}</Flex>
							: null
					}
				</div>
			</ErrorBoundary>
		);
	}

	const sections = props.sections || [ 'stamina', 'conditions' ];
	const showStamina = sections.includes('stamina');
	const showConditions = sections.includes('conditions');

	return (
		<ErrorBoundary>
			<div className='health-panel'>
				{
					showStamina && props.stamina ?
						<div className='health-panel-stamina'>
							<HealthBars stamina={props.stamina} staminaTemp={props.staminaTemp} recoveries={props.recoveries} />
							{getHealthControls()}
						</div>
						: null
				}
				{
					showStamina && props.stamina && ![ 'healthy', 'injured', 'dying' ].includes(props.stamina.state) ?
						<Alert
							type='warning'
							showIcon={true}
							title={`You are ${props.stamina.state}.`}
						/>
						: null
				}
				{
					showStamina && props.stamina && (props.stamina.state === 'dying') ?
						<Alert
							type='warning'
							showIcon={true}
							title={
								<Markdown
									text={`
You are dying.

You can’t take the Catch Breath maneuver in combat, and you are bleeding, and this condition can’t be removed in any way until you are no longer dying.

Your allies can help you spend Recoveries in combat, and you can spend Recoveries out of combat as usual.`}
								/>
							}
						/>
						: null
				}
				{
					showStamina && props.stamina && props.stamina.immunities.length > 0 ?
						<Field label='Immunities' value={props.stamina.immunities.map(dm => `${dm.damageType} ${dm.value}`).join(', ')} />
						: null
				}
				{
					showStamina && props.stamina && props.stamina.weaknesses.length > 0 ?
						<Field label='Weakness' value={props.stamina.weaknesses.map(dm => `${dm.damageType} ${dm.value}`).join(', ')} />
						: null
				}
				{
					props.showToggles && (props.hidden || props.defeated || props.captain) ?
						<>
							<Flex align='center' justify='space-evenly' gap={10} style={{ margin: '10px 0' }}>
								{
									props.hidden ?
										<div className='toggle-button'>
											<div className='toggle-button-label'>Hiding</div>
											<Segmented
												block={true}
												options={[
													{ value: true, label: 'Hidden' },
													{ value: false, label: 'Visible' }
												]}
												value={props.hidden.value}
												onChange={props.hidden.setValue}
											/>
										</div>
										: null
								}
								{
									props.defeated ?
										<div className='toggle-button'>
											<div className='toggle-button-label'>State</div>
											<Segmented
												block={true}
												options={[
													{ value: true, label: 'Defeated' },
													{ value: false, label: 'Active' }
												]}
												value={props.defeated.value}
												onChange={props.defeated.setValue}
											/>
										</div>
										: null
								}
								{
									props.captain ?
										<DropdownButton
											style={{ flex: '1 1 0' }}
											className='tall-button'
											label='Captain'
											items={
												props.captain.candidates.map(m => ({
													key: m.id,
													label: (
														<div
															style={{
																padding: '5px 10px',
																borderRadius: '5px',
																background: (m.id === props.captain!.captainID ? 'rgb(64, 150, 255)' : undefined),
																color: (m.id === props.captain!.captainID ? 'rgb(255, 255, 255)' : undefined)
															}}
														>
															<MonsterInfo monster={m} />
														</div>
													)
												}))
											}
											onClick={props.captain.setCaptainID}
										/>
										: null
								}
							</Flex>
						</>
						: null
				}
				{
					showConditions ?
						<>
							<HeaderText
								extra={
									<Space>
										<Popover
											trigger='click'
											open={addConditionOpen}
											onOpenChange={setAddConditionOpen}
											content={
												<div className='add-condition-popover'>
													<div className='add-condition-grid'>
														{
															conditionTypes.map(c => {
																const immune = props.conditions.immunities.includes(c);
																return (
																	<button
																		key={c}
																		type='button'
																		className={`add-condition-chip${immune ? ' immune' : ''}`}
																		disabled={immune}
																		title={immune ? `Immune to ${c}` : ConditionLogic.getDescription(c)}
																		onClick={() => addCondition(c)}
																	>
																		{c}
																	</button>
																);
															})
														}
													</div>
													<div className='add-condition-quick'>
														<Button size='small' type='text' onClick={() => { setAddConditionOpen(false); addSpecial('Judged'); }}>+ Judged</Button>
														<Button size='small' type='text' onClick={() => { setAddConditionOpen(false); addSpecial('Marked'); }}>+ Marked</Button>
														<Button size='small' type='text' onClick={() => { setAddConditionOpen(false); addSpecial('Surprised'); }}>+ Surprised</Button>
													</div>
												</div>
											}
										>
											<Button>
												<PlusOutlined />
												Add a condition
												<DownOutlined />
											</Button>
										</Popover>
									</Space>
								}
							>
								Conditions
							</HeaderText>
							{
								props.conditions.current.map(c => (
									<ConditionPanel
										key={c.id}
										condition={c}
										onChange={props.editCondition}
										onDelete={props.deleteCondition}
									/>
								))
							}
							{
								props.conditions.current.length === 0 ?
									<Empty text='You are not affected by any conditions.' />
									: null
							}
						</>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
