import { Button, Drawer, Flex } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Encounter } from '@/models/encounter';
import { EncounterDifficultyPanel } from '@/components/panels/encounter-difficulty/encounter-difficulty-panel';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FactoryLogic } from '@/logic/factory-logic';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Monster } from '@/models/monster';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterPanel } from '@/components/panels/elements/monster-panel/monster-panel';
import { MonsterSelectModal } from '@/components/modals/select/monster-select/monster-select-modal';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Terrain } from '@/models/terrain';
import { TerrainPanel } from '@/components/panels/elements/terrain-panel/terrain-panel';
import { Utils } from '@/utils/utils';
import { useRef, useState } from 'react';

import './encounter-run-panel.scss';

interface Props {
	encounter: Encounter;
	sourcebooks: Sourcebook[];
	onChange: (encounter: Encounter) => void;
}

// A flat row in the left-column tracker — either a monster slot (a unit:
// solo, elite, leader, squad of minions, etc.) or a terrain piece.
type Combatant =
	| { kind: 'monster'; id: string; groupID: string; slot: EncounterSlot; monsters: Monster[]; name: string; count: number }
	| { kind: 'terrain'; id: string; terrain: Terrain; name: string };

export const EncounterRunPanel = (props: Props) => {
	const [ encounter, setEncounter ] = useState<Encounter>(Utils.copy(props.encounter));
	const [ addingMonsters, setAddingMonsters ] = useState<boolean>(false);
	const [ focusedID, setFocusedID ] = useState<string | null>(null);

	// Per-combatant refs so clicking the tracker row scrolls the matching stat block.
	const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

	const commit = (next: Encounter) => {
		setEncounter(next);
		props.onChange(next);
	};

	// Round +/- doubles as the "new round" affordance: bumping the round clears
	// every group's acted flag so the next round starts clean.
	const setRound = (value: number) => {
		const copy = Utils.copy(encounter);
		copy.round = value;
		copy.groups.forEach(g => { g.encounterState = 'ready'; });
		commit(copy);
	};

	const setMalice = (value: number) => {
		const copy = Utils.copy(encounter);
		copy.malice = value;
		commit(copy);
	};

	const toggleGroupActed = (groupID: string) => {
		const copy = Utils.copy(encounter);
		const g = copy.groups.find(gg => gg.id === groupID);
		if (g) {
			g.encounterState = g.encounterState === 'finished' ? 'ready' : 'finished';
		}
		commit(copy);
	};

	const addMonsterAsGroup = (monster: Monster) => {
		const slot = FactoryLogic.createEncounterSlot(monster.id);
		slot.count = MonsterLogic.getRoleMultiplier(monster.role.organization);
		while (slot.monsters.length < slot.count) {
			const m = Utils.copy(monster);
			m.id = Utils.guid();
			slot.monsters.push(m);
		}
		const group = FactoryLogic.createEncounterGroup();
		group.slots.push(slot);

		const copy = Utils.copy(encounter);
		copy.groups.push(group);
		commit(copy);
	};

	const deleteGroup = (groupID: string) => {
		const copy = Utils.copy(encounter);
		copy.groups = copy.groups.filter(g => g.id !== groupID);
		commit(copy);
	};

	const deleteTerrain = (terrainID: string) => {
		const copy = Utils.copy(encounter);
		copy.terrain.forEach(ts => { ts.terrain = ts.terrain.filter(t => t.id !== terrainID); });
		copy.terrain = copy.terrain.filter(ts => ts.terrain.length > 0);
		commit(copy);
	};

	const updateTerrain = (terrain: Terrain) => {
		const copy = Utils.copy(encounter);
		copy.terrain.forEach(ts => {
			const i = ts.terrain.findIndex(t => t.id === terrain.id);
			if (i !== -1) ts.terrain[i] = terrain;
		});
		commit(copy);
	};

	const focusBlock = (id: string) => {
		setFocusedID(id);
		const el = blockRefs.current[id];
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	// Build the left-column tracker rows in encounter order — one row per slot
	// (a slot is a unit: solo monster, elite, minion squad of 4, etc.) so the
	// GM tracks each combat unit once.
	const trackerRows: Combatant[] = [];
	encounter.groups.forEach((g, gIdx) => {
		g.slots.forEach(slot => {
			if (slot.monsters.length === 0) return;
			const lead = slot.monsters[0];
			trackerRows.push({
				kind: 'monster',
				id: slot.id,
				groupID: g.id,
				slot,
				monsters: slot.monsters,
				name: lead.name || g.name || `Group ${gIdx + 1}`,
				count: slot.monsters.length
			});
		});
	});
	encounter.terrain.flatMap(ts => ts.terrain).forEach(t => {
		trackerRows.push({ kind: 'terrain', id: t.id, terrain: t, name: t.name || 'Terrain' });
	});

	// Right column flattens to per-monster stat blocks (each minion needs its
	// own HP tracking), sorted alphabetically by name.
	const statBlocks: Combatant[] = [ ...trackerRows ].sort((a, b) => a.name.localeCompare(b.name));

	return (
		<ErrorBoundary>
			<div className='encounter-run-panel' id={encounter.id}>
				<Flex align='flex-start' gap={20} className='encounter-run-flex'>
					<div className='encounter-run-column encounter-run-tracker'>
						<HeaderText level={1}>{encounter.name || 'Unnamed Encounter'}</HeaderText>

						<div className='encounter-run-controls'>
							<NumberSpin min={0} value={encounter.round} onChange={setRound}>
								<Field orientation='vertical' label='Round' value={encounter.round || '-'} />
							</NumberSpin>
							<NumberSpin min={0} value={encounter.malice} onChange={setMalice}>
								<Field orientation='vertical' label='Malice' value={encounter.malice} />
							</NumberSpin>
						</div>

						<div className='encounter-run-add'>
							<Button icon={<PlusOutlined />} onClick={() => setAddingMonsters(true)}>Add monster</Button>
						</div>

						<HeaderText level={2}>Combatants</HeaderText>

						{
							trackerRows.length === 0 ?
								<div className='ds-text dimmed-text centered-text'>No combatants yet — add monsters or terrain to begin.</div>
								:
								<div className='tracker-rows'>
									{
										trackerRows.map(c => {
											const acted = c.kind === 'monster'
												? encounter.groups.find(g => g.id === c.groupID)?.encounterState === 'finished'
												: false;
											const focused = focusedID === c.id;
											return (
												<div
													key={c.id}
													className={[
														'tracker-row',
														acted ? 'acted' : '',
														focused ? 'focused' : '',
														c.kind === 'terrain' ? 'terrain' : ''
													].filter(Boolean).join(' ')}
													onClick={() => focusBlock(c.id)}
												>
													{
														c.kind === 'monster' ?
															<Button
																type='text'
																className='acted-toggle'
																icon={acted ? <CheckCircleFilled /> : <CheckCircleOutlined />}
																title={acted ? 'Mark as not yet acted' : 'Mark as acted this round'}
																onClick={e => { e.stopPropagation(); toggleGroupActed(c.groupID); }}
															/>
															: <div className='acted-toggle terrain-spacer' />
													}
													<div className='row-info'>
														<div className='row-name'>
															{c.name}
															{c.kind === 'monster' && c.count > 1 ? <span className='row-count'> ×{c.count}</span> : null}
														</div>
														<div className='row-sub'>
															{
																c.kind === 'monster'
																	? MonsterLogic.getMonsterDescription(c.monsters[0])
																	: 'Terrain'
															}
														</div>
													</div>
													<Button
														type='text'
														className='row-delete'
														icon={<DeleteOutlined />}
														title='Remove'
														onClick={e => {
															e.stopPropagation();
															if (c.kind === 'monster') {
																deleteGroup(c.groupID);
															} else {
																deleteTerrain(c.id);
															}
														}}
													/>
												</div>
											);
										})
									}
								</div>
						}

						<HeaderText level={2}>Difficulty</HeaderText>
						<EncounterDifficultyPanel
							encounter={encounter}
							sourcebooks={props.sourcebooks}
							showHeader={false}
						/>
					</div>

					<div className='encounter-run-column encounter-run-stats'>
						{
							statBlocks.length === 0 ?
								<div className='ds-text dimmed-text centered-text'>Stat blocks will appear here as combatants are added.</div>
								:
								statBlocks.map(c => (
									<div
										key={c.id}
										ref={el => { blockRefs.current[c.id] = el; }}
										className={`stat-block ${focusedID === c.id ? 'focused' : ''}`}
									>
										{
											c.kind === 'monster' ?
												<MonsterPanel
													monster={c.monsters[0]}
													monsterGroup={SourcebookLogic.getMonsterGroup(props.sourcebooks, c.monsters[0].id) || undefined}
													sourcebooks={props.sourcebooks}
													mode={PanelMode.Full}
												/>
												:
												<TerrainPanel
													terrain={c.terrain}
													sourcebooks={props.sourcebooks}
													mode={PanelMode.Full}
													updateTerrain={updateTerrain}
												/>
										}
									</div>
								))
						}
					</div>
				</Flex>

				<Drawer open={addingMonsters} onClose={() => setAddingMonsters(false)} closeIcon={null} size={500}>
					<MonsterSelectModal
						monsters={props.sourcebooks.flatMap(sb => sb.monsterGroups).flatMap(g => g.monsters)}
						sourcebooks={props.sourcebooks}
						onClose={() => setAddingMonsters(false)}
						onSelect={m => { setAddingMonsters(false); addMonsterAsGroup(m); }}
					/>
				</Drawer>
			</div>
		</ErrorBoundary>
	);
};
