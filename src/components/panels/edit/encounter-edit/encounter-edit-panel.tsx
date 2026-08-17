import { Alert, Button, Flex, Select, Space } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, CheckCircleOutlined, CloseCircleOutlined, CopyOutlined, EditFilled, EditOutlined, EllipsisOutlined, FilterFilled, FilterOutlined, InfoCircleOutlined, PlusOutlined, ToolFilled, ToolOutlined } from '@ant-design/icons';
import { Encounter, EncounterGroup, TerrainSlot } from '@/models/encounter';
import { EncounterSlot, EncounterSlotCustomization } from '@/models/encounter-slot';
import { Fragment, ReactNode, useEffect, useState } from 'react';
import { MonsterFilter, TerrainFilter } from '@/models/filter';
import { MonsterInfo, TerrainInfo } from '@/components/panels/token/token';
import { useHeroes, useOptions } from '@/contexts/data-context';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { Collections } from '@/utils/collections';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DropdownButton } from '@/components/controls/dropdown-button/dropdown-button';
import { Empty } from '@/components/controls/empty/empty';
import { EncounterDifficultyLogic } from '@/logic/encounter-difficulty-logic';
import { EncounterDifficultyPanel } from '@/components/panels/encounter-difficulty/encounter-difficulty-panel';
import { EncounterLogic } from '@/logic/encounter-logic';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Expander } from '@/components/controls/expander/expander';
import { FactoryLogic } from '@/logic/factory-logic';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Monster } from '@/models/monster';
import { MonsterFilterPanel } from '@/components/panels/monster-filter/monster-filter-panel';
import { MonsterGroup } from '@/models/monster-group';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterOrganizationType } from '@/enums/monster-organization-type';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { OptionsLogic } from '@/logic/options-logic';
import { PanelMode } from '@/enums/panel-mode';
import { Pill } from '@/components/controls/pill/pill';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Terrain } from '@/models/terrain';
import { TerrainFilterPanel } from '@/components/panels/terrain-filter/terrain-filter-panel';
import { TerrainLogic } from '@/logic/terrain-logic';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';

import './encounter-edit-panel.scss';

// Subsequence matching: every letter of the query has to appear in the name, in
// order, but not necessarily together - so "drgthn" finds "Dragon, Thorn". The
// score rewards matches that are contiguous and near the start, which puts the
// obvious answer first without pulling in a search library.
const fuzzyScore = (name: string, query: string) => {
	const haystack = name.toLowerCase();
	const needle = query.toLowerCase().trim();
	if (!needle) {
		return 0;
	}

	let score = 0;
	let from = 0;
	let previous = -2;
	for (const char of needle) {
		if (char === ' ') {
			continue;
		}
		const at = haystack.indexOf(char, from);
		if (at < 0) {
			return -1;
		}
		score += at === previous + 1 ? 3 : 1;
		if (at === 0) {
			score += 3;
		}
		previous = at;
		from = at + 1;
	}

	// shorter names matching the same letters are the better answer
	return score - haystack.length / 100;
};

interface Props {
	encounter: Encounter;
	sourcebooks: Sourcebook[];
	onChange: (encounter: Encounter) => void;
	showMonster: (monster: Monster, monsterGroup: MonsterGroup) => void;
	showTerrain: (terrain: Terrain, upgradeIDs: string[]) => void;
}

export const EncounterEditPanel = (props: Props) => {
	const [ encounter, setEncounter ] = useState<Encounter>(props.encounter);
	const [ filterVisible, setFilterVisible ] = useState<boolean>(false);
	// The group a clicked monster lands in. Defaults to the first one, which on
	// a new encounter is Red.
	const [ activeGroupID, setActiveGroupID ] = useState<string | null>(props.encounter.groups[0]?.id ?? null);
	const [ monsterSearch, setMonsterSearch ] = useState<string>('');
	const [ monsterFilter, setMonsterFilter ] = useState<MonsterFilter>(FactoryLogic.createMonsterFilter());
	const [ terrainFilter, setTerrainFilter ] = useState<TerrainFilter>(FactoryLogic.createTerrainFilter());
	const options = useOptions();
	const heroes = useHeroes();

	const addMonster = (monster: Monster, encounterGroupID: string | null) => {
		const copy = Utils.copy(encounter);
		const targetID = encounterGroupID ?? activeGroupID;

		const group = targetID ? copy.groups.find(g => g.id === targetID) : undefined;
		if (group) {
			group.slots.push(FactoryLogic.createEncounterSlot(monster.id));
		} else {
			const created = FactoryLogic.createEncounterGroup();
			created.slots.push(FactoryLogic.createEncounterSlot(monster.id));
			copy.groups.push(created);
			setActiveGroupID(created.id);
		}

		setEncounter(copy);
		props.onChange(copy);
	};

	// Shift+A starts the next group and points new monsters at it.
	const addGroup = () => {
		const copy = Utils.copy(encounter);
		const created = FactoryLogic.createEncounterGroup();
		copy.groups.push(created);
		setEncounter(copy);
		setActiveGroupID(created.id);
		props.onChange(copy);
	};

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (!e.shiftKey || e.key.toLowerCase() !== 'a' || e.metaKey || e.ctrlKey || e.altKey) {
				return;
			}

			// Deliberately fires while the search box has focus, since that's
			// where the cursor starts; searching is case-insensitive, so nothing
			// needs a capital A typed into it.
			e.preventDefault();
			addGroup();
		};

		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});

	const getEncounterWarnings = () => {
		const warnings: { key: string; title: string }[] = [];

		const statblocks = Collections.distinct(encounter.groups.flatMap(g => g.slots).map(s => s.monsterID), s => s).length;
		if (statblocks > 6) {
			warnings.push({
				key: 'too-many-statblocks',
				title: `You shouldn't generally have more than 6 different types of monster (this encounter has ${statblocks}).`
			});
		}

		encounter.groups.forEach((g, i) => {
			if (g.slots.length === 0) { return; }
			const label = g.name || EncounterLogic.getDefaultGroupName(i);
			const strength = EncounterDifficultyLogic.getGroupStrength(g, props.sourcebooks);
			const heroValue = EncounterDifficultyLogic.getHeroValue(options.heroLevel);
			if (strength < heroValue) {
				warnings.push({ key: `weak-${g.id}`, title: `${label} may be too weak — consider adding monsters.` });
			} else if (strength > heroValue * 2) {
				warnings.push({ key: `strong-${g.id}`, title: `${label} may be too strong — consider splitting it.` });
			}
		});

		return warnings;
	};

	const addTerrain = (terrain: Terrain) => {
		const copy = Utils.copy(encounter);

		const data = copy.terrain.find(t => t.terrainID === terrain.id);
		if (data) {
			data.count += 1;
		} else {
			copy.terrain.push({
				id: Utils.guid(),
				terrainID: terrain.id,
				upgradeIDs: [],
				count: 1,
				terrain: []
			});
		}

		setEncounter(copy);
		props.onChange(copy);
	};

	const getNameAndDescriptionSection = () => {
		const setName = (value: string) => {
			const copy = Utils.copy(encounter);
			copy.name = value;
			setEncounter(copy);
			props.onChange(copy);
		};

		return (
			<TextInput
				status={encounter.name === '' ? 'warning' : ''}
				placeholder='Name'
				allowClear={true}
				value={encounter.name}
				onChange={setName}
			/>
		);
	};

	const getMonstersSection = () => {
		const setName = (group: EncounterGroup, value: string) => {
			const copy = Utils.copy(encounter);
			copy.groups.filter(g => g.id === group.id).forEach(g => g.name = value);
			setEncounter(copy);
			props.onChange(copy);
		};

		const setMinHeroCount = (group: EncounterGroup, value: number | undefined) => {
			const copy = Utils.copy(encounter);
			copy.groups.filter(g => g.id === group.id).forEach(g => g.minHeroCount = value);
			setEncounter(copy);
			props.onChange(copy);
		};

		const copyGroup = (group: EncounterGroup) => {
			const groupCopy = Utils.copy(group);
			groupCopy.id = Utils.guid();
			groupCopy.slots.forEach(s => s.id = Utils.guid());

			const copy = Utils.copy(encounter);
			copy.groups.push(groupCopy);
			setEncounter(copy);
			props.onChange(copy);
		};

		const moveGroup = (index: number, direction: 'up' | 'down') => {
			const copy = Utils.copy(encounter);
			copy.groups = Collections.move(copy.groups, index, direction);
			setEncounter(copy);
			props.onChange(copy);
		};

		const deleteGroup = (group: EncounterGroup) => {
			const copy = Utils.copy(encounter);
			copy.groups = copy.groups.filter(g => g.id !== group.id);
			setEncounter(copy);
			props.onChange(copy);
		};

		const getSlot = (slot: EncounterSlot, group: EncounterGroup) => {
			const moveSlot = (slotID: string, fromGroupID: string, toGroupID: string, remove: boolean) => {
				const copy = Utils.copy(encounter);
				const fromGroup = copy.groups.find(g => g.id === fromGroupID);
				let toGroup = copy.groups.find(g => g.id === toGroupID);
				if (!toGroup) {
					toGroup = FactoryLogic.createEncounterGroup();
					copy.groups.push(toGroup);
				}
				if (fromGroup && toGroup) {
					const slot = fromGroup.slots.find(s => s.id === slotID);
					if (slot) {
						if (remove) {
							fromGroup.slots = fromGroup.slots.filter(s => s.id !== slotID);
						}
						const slotCopy = Utils.copy(slot);
						slotCopy.id = Utils.guid();
						toGroup.slots.push(slotCopy);
					}
				}
				setEncounter(copy);
				props.onChange(copy);
			};

			const setSlotCount = (groupID: string, slotID: string, value: number) => {
				const copy = Utils.copy(encounter);
				const group = copy.groups.find(g => g.id === groupID);
				if (group) {
					const slot = group.slots.find(s => s.id === slotID);
					if (slot) {
						slot.count = value;

						if (slot.count === 0) {
							group.slots = group.slots.filter(s => s.id !== slotID);
						}
					}

					if (group.slots.length === 0) {
						copy.groups = copy.groups.filter(g => g.id !== groupID);
					}
				}
				setEncounter(copy);
				props.onChange(copy);
			};

			const setCustomization = (groupID: string, slotID: string, value: EncounterSlotCustomization) => {
				const copy = Utils.copy(encounter);
				const group = copy.groups.find(g => g.id === groupID);
				if (group) {
					const slot = group.slots.find(s => s.id === slotID);
					if (slot) {
						slot.customization = value;
					}
				}
				setEncounter(copy);
				props.onChange(copy);
			};

			return (
				<MonsterSlotPanel
					key={slot.id}
					slot={slot}
					groupID={group.id}
					encounter={encounter}
					sourcebooks={props.sourcebooks}
					showMonster={props.showMonster}
					moveSlot={moveSlot}
					setSlotCount={setSlotCount}
					setCustomization={setCustomization}
				/>
			);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					encounter.groups.map((group, n) => (
						<SelectablePanel key={group.id}>
							<GroupPanel
								group={group}
								index={n}
								active={group.id === activeGroupID}
								setActive={() => setActiveGroupID(group.id)}
								sourcebooks={props.sourcebooks}
								setName={setName}
								setMinHeroCount={setMinHeroCount}
								copyGroup={copyGroup}
								moveGroup={moveGroup}
								deleteGroup={deleteGroup}
								getSlot={getSlot}
							/>
						</SelectablePanel>
					))
				}
				{
					encounter.groups.length === 0 ?
						<div className='ds-text dimmed-text centered-text'>No groups yet — pick a monster from the picker.</div>
						: null
				}
			</Space>
		);
	};

	const getTerrainSection = () => {
		const getTerrain = (slot: TerrainSlot) => {
			const setTerrainCount = (id: string, value: number) => {
				const copy = Utils.copy(encounter);
				const slot = copy.terrain.find(t => t.id === id);
				if (slot) {
					slot.count = value;

					if (slot.count === 0) {
						copy.terrain = copy.terrain.filter(t => t.id !== id);
					}
				}
				setEncounter(copy);
				props.onChange(copy);
			};

			const setTerrainUpgradeIDs = (id: string, value: string[]) => {
				const copy = Utils.copy(encounter);
				const slot = copy.terrain.find(t => t.id === id);
				if (slot) {
					slot.upgradeIDs = value;
				}
				setEncounter(copy);
				props.onChange(copy);
			};

			return (
				<TerrainSlotPanel
					key={slot.id}
					slot={slot}
					sourcebooks={props.sourcebooks}
					showTerrain={props.showTerrain}
					setTerrainCount={setTerrainCount}
					setTerrainUpgradeIDs={setTerrainUpgradeIDs}
				/>
			);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<SelectablePanel style={{ paddingTop: '20px' }}>
					<div className='encounter-terrain-panel'>
						<div className='terrain-slots'>
							{encounter.terrain.map(slot => getTerrain(slot))}
							{
								encounter.terrain.length === 0 ?
									<div className='ds-text dimmed-text centered-text'>Add terrain from the picker.</div>
									: null
							}
						</div>
					</div>
				</SelectablePanel>
			</Space>
		);
	};

	const getMaliceSection = () => {
		const maliceFeatures = EncounterLogic.getAllMaliceFeatures(encounter, props.sourcebooks);

		const removeMaliceFeatureIds = (ids: string[]) => {
			const copy = Utils.copy(encounter);
			copy.hiddenMaliceFeatures = [ ...copy.hiddenMaliceFeatures, ...ids.filter(id => !copy.hiddenMaliceFeatures.includes(id)) ];

			setEncounter(copy);
			props.onChange(copy);
		};

		const addMaliceFeatureIds = (ids: string[]) => {
			const copy = Utils.copy(encounter);
			copy.hiddenMaliceFeatures = copy.hiddenMaliceFeatures.filter(f => !ids.includes(f));

			setEncounter(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					maliceFeatures.map((groupMalice, i) => {
						return (
							<Fragment key={`group-malice-${groupMalice.group}-${i}`}>
								<HeaderText
									extra={
										<Flex>
											<Button
												type='text'
												icon={<CloseCircleOutlined />}
												onClick={() => {
													const featureIds = groupMalice.features.map(f => f.id);
													removeMaliceFeatureIds(featureIds);
												}}
											/>
											<Button
												type='text'
												icon={<CheckCircleOutlined />}
												onClick={() => {
													const featureIds = groupMalice.features.map(f => f.id);
													addMaliceFeatureIds(featureIds);
												}}
											/>
										</Flex>
									}
								>
									{groupMalice.group}
								</HeaderText>
								{
									groupMalice.features.map(feature => (
										<Toggle
											key={`malice-feature-toggle-${i}-${feature.id}`}
											label={feature.name}
											value={!encounter.hiddenMaliceFeatures.includes(feature.id)}
											onChange={value => {
												if (value) {
													addMaliceFeatureIds([ feature.id ]);
												} else {
													removeMaliceFeatureIds([ feature.id ]);
												}
											}}
										/>
									))
								}
							</Fragment>
						);
					})
				}
			</Space>
		);
	};

	const getMonsterListSection = () => {
		const allGroups = props.sourcebooks.flatMap(sb => sb.monsterGroups);
		// Echelons match the Draw Steel rulebook: 1st (lvl 1-3), 2nd (4-6), 3rd (7-9), 4th (10).
		const echelons: { key: string; tier: string; range: string; inRange: (level: number) => boolean }[] = [
			{ key: '1', tier: '1st Echelon', range: 'Levels 1–3', inRange: lvl => lvl >= 1 && lvl <= 3 },
			{ key: '2', tier: '2nd Echelon', range: 'Levels 4–6', inRange: lvl => lvl >= 4 && lvl <= 6 },
			{ key: '3', tier: '3rd Echelon', range: 'Levels 7–9', inRange: lvl => lvl >= 7 && lvl <= 9 },
			{ key: '4', tier: '4th Echelon', range: 'Level 10', inRange: lvl => lvl === 10 }
		];

		const passes = (m: Monster) =>
			m.role.organization !== MonsterOrganizationType.Retainer && MonsterLogic.matches(m, monsterFilter);

		const echelonBuckets = echelons.map(e => {
			const groups: { group: MonsterGroup; monsters: Monster[] }[] = [];
			for (const g of allGroups) {
				const monsters = g.monsters.filter(m => passes(m) && e.inRange(m.level));
				if (monsters.length > 0) {
					groups.push({ group: g, monsters: Collections.sort(monsters, m => m.name) });
				}
			}
			return { echelon: e, groups: Collections.sort(groups, b => b.group.name) };
		});

		const anyMatches = echelonBuckets.some(b => b.groups.length > 0);

		// With a query, the echelon/monster-group drill-down gets in the way -
		// show one ranked list of monsters instead.
		const searchHits = monsterSearch.trim() ?
			allGroups
				.flatMap(g => g.monsters.filter(passes).map(m => ({ monster: m, group: g, score: fuzzyScore(m.name, monsterSearch) })))
				.filter(hit => hit.score >= 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, 40)
			: [];

		return (
			<Space orientation='vertical' style={{ width: '100%', padding: '5px' }}>
				<div className='monster-picker-search'>
					<TextInput
						autoFocus={true}
						allowClear={true}
						placeholder='Search monsters by name'
						value={monsterSearch}
						onChange={setMonsterSearch}
					/>
				</div>
				{
					filterVisible ?
						<MonsterFilterPanel
							monsterFilter={monsterFilter}
							monsters={props.sourcebooks.flatMap(sb => sb.monsterGroups).flatMap(g => g.monsters)}
							includeNameFilter={true}
							includeOrgFilter={true}
							includeEVFilter={true}
							onChange={setMonsterFilter}
						/>
						: null
				}
				{
					monsterSearch.trim() ?
						<div className='monster-search-results'>
							{
								searchHits.map(hit => (
									<MonsterListItem
										key={hit.monster.id}
										monster={hit.monster}
										monsterGroup={hit.group}
										encounter={encounter}
										addMonster={addMonster}
										showMonster={props.showMonster}
									/>
								))
							}
							{searchHits.length === 0 ? <Empty /> : null}
						</div>
						:
						<>
							{
								echelonBuckets.map(bucket =>
									bucket.groups.length > 0
										? (
											<div key={bucket.echelon.key} className='echelon-section' data-echelon={bucket.echelon.key}>
												<div className='echelon-header'>
													<span className='echelon-tier'>{bucket.echelon.tier}</span>
													<span className='echelon-divider' aria-hidden='true' />
													<span className='echelon-range'>{bucket.echelon.range}</span>
												</div>
												<Space orientation='vertical' style={{ width: '100%' }}>
													{
														bucket.groups.map(({ group, monsters }) => (
															<Expander key={`${bucket.echelon.key}-${group.id}`} title={group.name}>
																<Space orientation='vertical' style={{ width: '100%' }}>
																	{
																		monsters.map(m => (
																			<MonsterListItem
																				key={m.id}
																				monster={m}
																				monsterGroup={group}
																				encounter={encounter}
																				addMonster={addMonster}
																				showMonster={props.showMonster}
																			/>
																		))
																	}
																</Space>
															</Expander>
														))
													}
												</Space>
											</div>
										)
										: null
								)
							}
							{!anyMatches ? <Empty /> : null}
						</>
				}
			</Space>
		);
	};

	const getTerrainListSection = () => {
		const allTerrains = SourcebookLogic.getTerrains(props.sourcebooks);
		const terrains = Collections.sort(allTerrains.filter(m => TerrainLogic.matches(m, terrainFilter)), t => t.name);

		return (
			<Space orientation='vertical' style={{ width: '100%', padding: '5px' }}>
				{
					filterVisible ?
						<TerrainFilterPanel
							terrainFilter={terrainFilter}
							terrain={allTerrains}
							onChange={setTerrainFilter}
						/>
						: null
				}
				{
					terrains.map(t => (
						<TerrainListItem
							key={t.id}
							terrain={t}
							showTerrain={props.showTerrain}
							addTerrain={addTerrain}
						/>
					))
				}
				{
					terrains.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	const getDifficultySection = () => {
		const heroCount = OptionsLogic.getHeroCount(options, heroes);
		const strength = EncounterDifficultyLogic.getStrength(encounter, props.sourcebooks, heroCount);
		const difficulty = EncounterDifficultyLogic.getDifficulty(strength, options, heroes);
		const budgets = EncounterDifficultyLogic.getBudgets(options, heroes);

		// Pick the next tier's lower bound — value at which difficulty ticks up.
		const tiers: { label: string; threshold: number }[] = [
			{ label: 'Trivial', threshold: 1 },
			{ label: 'Easy', threshold: budgets.maxTrivial + 1 },
			{ label: 'Standard', threshold: budgets.maxEasy + 1 },
			{ label: 'Hard', threshold: budgets.maxStandard + 1 },
			{ label: 'Extreme', threshold: budgets.maxHard + 1 }
		];
		const next = tiers.find(t => strength < t.threshold);

		return (
			<Expander
				title={(
					<div className='threat-readout'>
						<span className='threat-tier'>{difficulty}</span>
						<span className='threat-meter'>
							<span className='threat-value'>EV {strength}</span>
							{next
								? (
									<>
										<span className='threat-arrow'>→</span>
										<span className='threat-next'>{next.threshold} {next.label}</span>
									</>
								)
								: null}
						</span>
					</div>
				)}
				style={{ flex: '0 0 auto' }}
			>
				<EncounterDifficultyPanel
					encounter={encounter}
					sourcebooks={props.sourcebooks}
				/>
			</Expander>
		);
	};

	return (
		<ErrorBoundary>
			<div className='encounter-edit-panel'>
				<div className='encounter-edit-stream'>
					<div className='encounter-pinned'>
						{getDifficultySection()}
						{
							getEncounterWarnings().map(w => (
								<div key={w.key} className='encounter-warning'>{w.title}</div>
							))
						}
					</div>

					<div className='encounter-grid'>
						<div className='encounter-workspace'>
							<section className='encounter-section'>
								<HeaderText>Encounter</HeaderText>
								{getNameAndDescriptionSection()}
							</section>

							<section className='encounter-section'>
								<HeaderText
									extra={
										<Button
											type='text'
											size='small'
											icon={<PlusOutlined />}
											onClick={addGroup}
										>
											Add group
										</Button>
									}
								>
									Monster Groups
								</HeaderText>
								{getMonstersSection()}
							</section>

							<section className='encounter-section'>
								<HeaderText>Terrain</HeaderText>
								{getTerrainSection()}
							</section>

							<section className='encounter-section'>
								<HeaderText>Malice</HeaderText>
								{getMaliceSection()}
							</section>
						</div>

						<aside className='encounter-pickers'>
							<section className='encounter-section'>
								<HeaderText
									extra={
										<Button
											type='text'
											size='small'
											icon={filterVisible ? <FilterFilled style={{ color: '#c9a45a' }} /> : <FilterOutlined />}
											onClick={() => setFilterVisible(!filterVisible)}
										>
											Filter
										</Button>
									}
								>
									Add a Monster
								</HeaderText>
								{getMonsterListSection()}
							</section>

							<section className='encounter-section'>
								<HeaderText>Add Terrain</HeaderText>
								{getTerrainListSection()}
							</section>
						</aside>
					</div>
				</div>
			</div>
		</ErrorBoundary>
	);
};

interface GroupPanelProps {
	group: EncounterGroup;
	index: number;
	active: boolean;
	setActive: () => void;
	sourcebooks: Sourcebook[];
	setName: (group: EncounterGroup, value: string) => void;
	setMinHeroCount: (group: EncounterGroup, value: number | undefined) => void;
	copyGroup: (group: EncounterGroup) => void;
	moveGroup: (index: number, direction: 'up' | 'down') => void;
	deleteGroup: (group: EncounterGroup) => void;
	getSlot: (slot: EncounterSlot, group: EncounterGroup) => ReactNode;
}

const GroupPanel = (props: GroupPanelProps) => {
	const [ editing, setEditing ] = useState<boolean>(false);

	return (
		<ErrorBoundary>
			<div
				className={props.active ? 'encounter-group-panel active-group' : 'encounter-group-panel'}
				onClick={props.setActive}
			>
				<HeaderText
					level={3}
					extra={
						<ButtonGroup
							buttons={[
								{ type: 'button', icon: editing ? <EditFilled style={{ color: 'rgb(22, 119, 255)' }} /> : <EditOutlined />, tooltip: 'Edit Group', onClick: () => setEditing(!editing) },
								{ type: 'button', icon: <CopyOutlined />, tooltip: 'Duplicate Group', onClick: () => props.copyGroup(props.group) },
								{ type: 'button', icon: <CaretUpOutlined />, tooltip: 'Move Up', disabled: props.index === 0, onClick: () => props.moveGroup(props.index, 'up') },
								{ type: 'button', icon: <CaretDownOutlined />, tooltip: 'Move Down', disabled: false, onClick: () => props.moveGroup(props.index, 'down') },
								{ type: 'control', control: <DangerButton key='delete' mode='clear' label='Delete Group' onConfirm={() => props.deleteGroup(props.group)} /> }
							]}
						/>
					}
				>
					{
						editing ?
							<TextInput
								placeholder='Group name'
								value={props.group.name}
								allowClear={true}
								onChange={value => props.setName(props.group, value)}
							/>
							:
							(props.group.name || EncounterLogic.getDefaultGroupName(props.index))
					}
				</HeaderText>
				<div className='group-slots'>
					{props.group.slots.map(slot => props.getSlot(slot, props.group))}
					{
						props.group.slots.length === 0 ?
							<div className='ds-text dimmed-text centered-text'>No monsters</div>
							: null
					}
				</div>
				{
					editing ?
						<div className='group-edit-row'>
							<Toggle
								label={`Only include this group when there are ${props.group.minHeroCount || 5} or more heroes`}
								value={props.group.minHeroCount !== undefined}
								onChange={checked => props.setMinHeroCount(props.group, checked ? 5 : undefined)}
							/>
							{
								props.group.minHeroCount ?
									<NumberSpin
										label='Heroes'
										value={props.group.minHeroCount}
										min={1}
										onChange={value => props.setMinHeroCount(props.group, value)}
									/>
									: null
							}
						</div>
						: null
				}
				{
					props.group.minHeroCount ?
						<Alert
							type='info'
							showIcon={true}
							title={`Only used with groups of at least ${props.group.minHeroCount} heroes`}
						/>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};

// #region Slots

interface MonsterSlotPanelProps {
	slot: EncounterSlot;
	groupID: string;
	encounter: Encounter;
	sourcebooks: Sourcebook[];
	showMonster: (monster: Monster, group: MonsterGroup) => void;
	moveSlot: (slotID: string, fromGroupID: string, toGroupID: string, remove: boolean) => void;
	setSlotCount: (groupID: string, slotID: string, value: number) => void;
	setCustomization: (groupID: string, slotID: string, value: EncounterSlotCustomization) => void;
}

const MonsterSlotPanel = (props: MonsterSlotPanelProps) => {
	const [ showCustomize, setShowCustomize ] = useState<boolean>(false);

	const originalMonster = SourcebookLogic.getMonster(props.sourcebooks, props.slot.monsterID);
	const monster = EncounterLogic.getCustomizedMonster(props.slot.monsterID, props.slot.customization, props.sourcebooks);
	const monsterGroup = SourcebookLogic.getMonsterGroup(props.sourcebooks, props.slot.monsterID);

	if (!originalMonster || !monster || !monsterGroup) {
		return (
			<div className='slot-row'>
				Unknown monster
			</div>
		);
	}

	const getCustomizePanel = () => {
		const getLevelAdjust = () => {
			const setAdjustment = (value: number) => {
				const copy = Utils.copy(props.slot.customization);
				copy.levelAdjustment = value;
				props.setCustomization(props.groupID, props.slot.id, copy);
			};

			return (
				<Expander title='Level'>
					<NumberSpin
						min={1 - originalMonster.level}
						value={props.slot.customization.levelAdjustment}
						format={value => `${value + originalMonster.level}`}
						onChange={setAdjustment}
					/>
				</Expander>
			);
		};

		const getMinionCountAdjust = () => {
			const setAdjustment = (value: number) => {
				const copy = Utils.copy(props.slot.customization);
				copy.minionCountAdjustment = value;
				props.setCustomization(props.groupID, props.slot.id, copy);
			};

			if (monster.role.organization !== MonsterOrganizationType.Minion) {
				return null;
			}

			const count = props.slot.count * MonsterLogic.getRoleMultiplier(MonsterOrganizationType.Minion);

			return (
				<Expander title='Minion Count'>
					<NumberSpin
						min={1 - count}
						value={props.slot.customization.minionCountAdjustment}
						format={value => `${value + count}`}
						onChange={setAdjustment}
					/>
				</Expander>
			);
		};

		const getPromote = () => {
			const setSlotConvertToSolo = (value: boolean) => {
				const copy = Utils.copy(props.slot.customization);
				copy.convertToSolo = value;
				props.setCustomization(props.groupID, props.slot.id, copy);
			};

			if ((originalMonster.role.organization !== MonsterOrganizationType.Elite) && (originalMonster.role.organization !== MonsterOrganizationType.Leader)) {
				return null;
			}

			return (
				<Expander title='Promote to Solo'>
					<Toggle label='Turn this monster into a Solo' value={props.slot.customization.convertToSolo} onChange={setSlotConvertToSolo} />
				</Expander>
			);
		};

		const getAddOns = () => {
			const setSlotAddOnIDs = (value: string[]) => {
				const copy = Utils.copy(props.slot.customization);
				copy.itemIDs = value;
				props.setCustomization(props.groupID, props.slot.id, copy);
			};

			if (monsterGroup.addOns.length === 0) {
				return null;
			}

			return (
				<Expander title='Customize'>
					<Select
						style={{ width: '100%' }}
						placeholder='Select'
						mode='multiple'
						options={Collections.sort(monsterGroup.addOns, a => a.name).map(a => ({ value: a.id, label: a.name, feature: a, cost: a.data.cost }))}
						optionRender={option => <FeaturePanel feature={option.data.feature} cost={option.data.cost} mode={PanelMode.Full} />}
						value={props.slot.customization.addOnIDs}
						onChange={setSlotAddOnIDs}
					/>
				</Expander>
			);
		};

		const getTreasures = () => {
			const addItem = (value: string) => {
				const copy = Utils.copy(props.slot.customization);
				copy.itemIDs.push(value);
				props.setCustomization(props.groupID, props.slot.id, copy);
			};

			const removeItem = (value: string) => {
				const copy = Utils.copy(props.slot.customization);
				copy.itemIDs = copy.itemIDs.filter(id => id !== value);
				props.setCustomization(props.groupID, props.slot.id, copy);
			};

			return (
				<Expander title='Treasures'>
					{
						props.slot.customization.itemIDs.map(itemID => {
							const item = SourcebookLogic.getItems(props.sourcebooks).find(i => i.id === itemID);
							if (item) {
								return (
									<Flex align='center'>
										<Field label={item.name} value={item.description} />
										<DangerButton mode='icon' onConfirm={() => removeItem(itemID)} />
									</Flex>
								);
							}

							return null;
						})
					}
					<Select
						style={{ width: '100%' }}
						placeholder='Add an item'
						options={SourcebookLogic.getItems(props.sourcebooks).map(i => ({ value: i.id, label: <Field label={i.name} value={i.description} />, data: i }))}
						onChange={addItem}
					/>
				</Expander>
			);
		};

		return (
			<div className='customize-panel'>
				{getLevelAdjust()}
				{getMinionCountAdjust()}
				{getPromote()}
				{getAddOns()}
				{getTreasures()}
			</div>
		);
	};

	const getMenu = () => {
		return (
			<Space orientation='vertical'>
				<DropdownButton
					label='Move To'
					items={[
						...props.encounter.groups
							.map((g, n) => ({ id: g.id, name: g.name || EncounterLogic.getDefaultGroupName(n) }))
							.filter(g => g.id !== props.groupID)
							.map(g => ({ key: g.id, label: <div className='ds-text centered-text'>{g.name}</div> })),
						{ key: '', label: <div className='ds-text centered-text'>New Group</div> }
					]}
					onClick={toGroupID => props.moveSlot(props.slot.id, props.groupID, toGroupID, true)}
				/>
				<DropdownButton
					label='Copy To'
					items={[
						...props.encounter.groups
							.map((g, n) => ({ id: g.id, name: g.name || EncounterLogic.getDefaultGroupName(n) }))
							.filter(g => g.id !== props.groupID)
							.map(g => ({ key: g.id, label: <div className='ds-text centered-text'>{g.name}</div> })),
						{ key: '', label: <div className='ds-text centered-text'>New Group</div> }
					]}
					onClick={toGroupID => props.moveSlot(props.slot.id, props.groupID, toGroupID, false)}
				/>
			</Space>
		);
	};

	return (
		<ErrorBoundary>
			<div className={showCustomize ? 'slot-row customizing' : 'slot-row'}>
				<div className='content'>
					<Flex align='center' justify='space-between'>
						<MonsterInfo monster={monster} showEV={true} />
						<ButtonGroup
							buttons={[
								{ type: 'button', icon: <InfoCircleOutlined />, tooltip: 'Show stat block', onClick: () => props.showMonster(monster, monsterGroup) },
								{ type: 'button', icon: showCustomize ? <ToolFilled style={{ color: 'rgb(64, 150, 255)' }} /> : <ToolOutlined />, tooltip: 'Customize', onClick: () => setShowCustomize(!showCustomize) },
								{ type: 'dropdown', icon: <EllipsisOutlined />, popover: getMenu() }
							]}
						/>
					</Flex>
				</div>
				<div className='actions'>
					<NumberSpin
						value={props.slot.count}
						format={value => ((value * MonsterLogic.getRoleMultiplier(monster.role.organization)) + props.slot.customization.minionCountAdjustment).toString()}
						onChange={value => props.setSlotCount(props.groupID, props.slot.id, value)}
					/>
				</div>
			</div>
			{showCustomize ? getCustomizePanel() : null}
		</ErrorBoundary>
	);
};

interface TerrainSlotPanelProps {
	slot: TerrainSlot;
	sourcebooks: Sourcebook[];
	showTerrain: (terrain: Terrain, upgradeIDs: string[]) => void;
	setTerrainCount: (id: string, value: number) => void;
	setTerrainUpgradeIDs: (id: string, value: string[]) => void;
}

const TerrainSlotPanel = (props: TerrainSlotPanelProps) => {
	const [ showCustomize, setShowCustomize ] = useState<boolean>(false);

	const terrain = SourcebookLogic.getTerrains(props.sourcebooks).find(t => t.id === props.slot.terrainID);

	if (!terrain) {
		return (
			<div className='terrain-row'>
				Unknown terrain
			</div>
		);
	}

	const getCustomizePanel = () => {
		return (
			<div className='customize-panel'>
				<Expander title='Customize'>
					<Select
						style={{ width: '100%' }}
						placeholder='Select'
						mode='multiple'
						options={Collections.sort(terrain.upgrades, a => a.label).map(a => ({ value: a.id, label: a.label, cost: a.cost }))}
						optionRender={option => <Flex align='center' gap={8}><div className='ds-text'>{option.data.label}</div><Pill>+{option.data.cost} EV</Pill></Flex>}
						value={props.slot.upgradeIDs}
						onChange={ids => props.setTerrainUpgradeIDs(props.slot.id, ids)}
					/>
				</Expander>
			</div>
		);
	};

	return (
		<ErrorBoundary>
			<div className={showCustomize ? 'terrain-row customizing' : 'terrain-row'}>
				<div className='content'>
					<Flex align='center' justify='space-between'>
						<TerrainInfo terrain={terrain} />
						<ButtonGroup
							buttons={[
								{ type: 'button', icon: <InfoCircleOutlined />, tooltip: 'Show stat block', onClick: () => props.showTerrain(terrain, props.slot.upgradeIDs) },
								terrain.upgrades.length > 0 ? { type: 'button', icon: showCustomize ? <ToolFilled style={{ color: 'rgb(64, 150, 255)' }} /> : <ToolOutlined />, tooltip: 'Customize', onClick: () => setShowCustomize(!showCustomize) } : null
							]}
						/>
					</Flex>
				</div>
				<div className='actions'>
					<NumberSpin
						value={props.slot.count}
						onChange={value => props.setTerrainCount(props.slot.id, value)}
					/>
				</div>
			</div>
			{showCustomize ? getCustomizePanel() : null}
		</ErrorBoundary>
	);
};

// #endregion

// #region List items

interface MonsterListItemProps {
	monster: Monster;
	monsterGroup?: MonsterGroup;
	encounter?: Encounter;
	addMonster?: (monster: Monster, groupID: string | null) => void;
	showMonster?: (monster: Monster, monsterGroup: MonsterGroup) => void;
}

const MonsterListItem = (props: MonsterListItemProps) => {
	// One click puts the monster in the active group; the dropdown is still
	// there for the times you want a different one.
	const quickAdd = props.encounter && props.addMonster ?
		() => props.addMonster!(props.monster, null)
		: undefined;

	return (
		<div
			className={quickAdd ? 'monster-list-item clickable' : 'monster-list-item'}
			onClick={quickAdd}
		>
			<div className='info-container'>
				<MonsterInfo monster={props.monster} showEV={true} />
			</div>
			<div onClick={e => e.stopPropagation()}>
				<ButtonGroup
					buttons={[
						props.monsterGroup && props.showMonster ?
							{ type: 'button', icon: <InfoCircleOutlined />, tooltip: 'Stat Block', onClick: () => props.showMonster!(props.monster, props.monsterGroup!) }
							: null,
						props.encounter && props.addMonster && (props.encounter.groups.length === 0) ?
							{ type: 'button', icon: <PlusOutlined />, tooltip: 'Add', onClick: () => props.addMonster!(props.monster, null) }
							: null,
						props.encounter && props.addMonster && (props.encounter.groups.length !== 0) ?
							{
								type: 'dropdown',
								icon: <PlusOutlined />,
								tooltip: 'Add',
								popover: (
									<Space orientation='vertical'>
										{
											props.encounter!.groups.map((group, n) => (
												<Button key={group.id} type='text' block={true} onClick={() => props.addMonster!(props.monster, group.id)}>{group.name || EncounterLogic.getDefaultGroupName(n)}</Button>
											))
										}
										<Button key='' type='text' block={true} onClick={() => props.addMonster!(props.monster, null)}>New Group</Button>
									</Space>
								)
							}
							: null
					]}
				/>
			</div>
		</div>
	);
};

interface TerrainListItemProps {
	terrain: Terrain;
	addTerrain?: (terrain: Terrain) => void;
	showTerrain?: (terrain: Terrain, upgradeIDs: string[]) => void;
}

const TerrainListItem = (props: TerrainListItemProps) => {
	return (
		<div className='terrain-list-item'>
			<div className='info-container'>
				<TerrainInfo terrain={props.terrain} />
			</div>
			<ButtonGroup
				buttons={[
					props.showTerrain ?
						{ type: 'button', icon: <InfoCircleOutlined />, tooltip: 'Stat Block', onClick: () => props.showTerrain!(props.terrain, []) }
						: null,
					props.addTerrain ?
						{ type: 'button', icon: <PlusOutlined />, tooltip: 'Add', onClick: () => props.addTerrain!(props.terrain) }
						: null
				]}
			/>
		</div>
	);
};

// #endregion
