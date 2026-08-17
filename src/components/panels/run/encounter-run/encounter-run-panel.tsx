import { Button, Drawer, Flex, Input } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined, CopyOutlined, DeleteOutlined, ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { Encounter, EncounterGroup } from '@/models/encounter';
import { useEffect, useRef, useState } from 'react';
import { EncounterDifficultyPanel } from '@/components/panels/encounter-difficulty/encounter-difficulty-panel';
import { EncounterLogic } from '@/logic/encounter-logic';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FactoryLogic } from '@/logic/factory-logic';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { MalicePanel } from '@/components/panels/malice/malice-panel';
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
import { VttExportLogic } from '@/logic/vtt-export-logic';
import { useMediaQuery } from '@/hooks/use-media-query';

import './encounter-run-panel.scss';

interface Props {
	encounter: Encounter;
	sourcebooks: Sourcebook[];
	onChange: (encounter: Encounter) => void;
}

// A row in the tracker. Groups own the acted flag; rows show HP per-instance.
// Every monster — including each minion in a squad — gets its own row so the
// GM can damage them independently, even though they share a stat block.
type Row =
	| { kind: 'monster'; rowID: string; groupID: string; slot: EncounterSlot; monster: Monster; name: string; statBlockKey: string }
	| { kind: 'terrain'; rowID: string; terrain: Terrain; name: string; statBlockKey: string };

const monsterBlockKey = (monsterID: string) => `monster-${monsterID}`;
const terrainBlockKey = (terrainID: string) => `terrain-${terrainID}`;

export const EncounterRunPanel = (props: Props) => {
	const [ encounter, setEncounter ] = useState<Encounter>(Utils.copy(props.encounter));
	const [ addingMonsters, setAddingMonsters ] = useState<boolean>(false);
	// The group additions land in. It persists between adds so the search can
	// stay open and every click piles into the same group; adding with nothing
	// selected creates a group and selects it.
	const [ addTargetGroupID, setAddTargetGroupID ] = useState<string | null>(null);
	const [ focusedBlock, setFocusedBlock ] = useState<string | null>(null);
	const [ showVttExport, setShowVttExport ] = useState<boolean>(false);
	const [ vttExportCopied, setVttExportCopied ] = useState<boolean>(false);

	const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

	// Below this the three columns would each be narrower than a stat block
	// wants to be, so the stat blocks stay in one column.
	const threeColumn = useMediaQuery('(min-width: 1300px)');

	// Shift+A starts a fresh group and points additions at it, so building an
	// encounter is: search, click a few, shift+A, click a few more - without
	// going back to the mouse to say where they land.
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (!e.shiftKey || e.key.toLowerCase() !== 'a') {
				return;
			}

			const target = e.target as HTMLElement | null;
			const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
			if (typing) {
				return;
			}

			e.preventDefault();
			addGroup();
		};

		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});

	const commit = (next: Encounter) => {
		setEncounter(next);
		props.onChange(next);
	};

	// Bumping Round clears every group's acted flag so the next round starts clean.
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

	const copyVttExport = () => {
		navigator.clipboard.writeText(VttExportLogic.toJson(encounter));
		setVttExportCopied(true);
		setTimeout(() => setVttExportCopied(false), 1500);
	};

	// Naming is left to EncounterLogic.renumberGroup once the slot is in a
	// group: numbers run across the group, so a slot on its own can't know them.
	const buildSlot = (monster: Monster) => {
		const slot = FactoryLogic.createEncounterSlot(monster.id);
		slot.count = MonsterLogic.getRoleMultiplier(monster.role.organization);
		while (slot.monsters.length < slot.count) {
			const m = Utils.copy(monster);
			m.id = Utils.guid();
			slot.monsters.push(m);
		}
		return slot;
	};

	const addMonster = (monster: Monster) => {
		const slot = buildSlot(monster);
		const copy = Utils.copy(encounter);
		if (addTargetGroupID) {
			const target = copy.groups.find(g => g.id === addTargetGroupID);
			if (target) {
				target.slots.push(slot);
				EncounterLogic.renumberGroup(target);
			}
		} else {
			const group = FactoryLogic.createEncounterGroup();
			group.slots.push(slot);
			EncounterLogic.renumberGroup(group);
			copy.groups.push(group);
			setAddTargetGroupID(group.id);
		}
		commit(copy);
	};

	const deleteGroup = (groupID: string) => {
		const copy = Utils.copy(encounter);
		copy.groups = copy.groups.filter(g => g.id !== groupID);
		commit(copy);
	};

	const deleteMonster = (monsterID: string) => {
		const copy = Utils.copy(encounter);
		copy.groups.forEach(g => {
			g.slots.forEach(s => { s.monsters = s.monsters.filter(m => m.id !== monsterID); });
			g.slots = g.slots.filter(s => s.monsters.length > 0);
			// Close the gap the removed monster left rather than skipping a number.
			EncounterLogic.renumberGroup(g);
		});
		copy.groups = copy.groups.filter(g => g.slots.length > 0);
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
			if (i !== -1) { ts.terrain[i] = terrain; }
		});
		commit(copy);
	};

	const setMonsterStaminaDamage = (monsterID: string, value: number) => {
		const copy = Utils.copy(encounter);
		copy.groups.forEach(g => {
			g.slots.forEach(s => {
				const m = s.monsters.find(mm => mm.id === monsterID);
				if (m) { m.state.staminaDamage = Math.max(0, value); }
			});
		});
		commit(copy);
	};

	const focusBlockByKey = (key: string) => {
		setFocusedBlock(key);
		const el = blockRefs.current[key];
		if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
	};

	const openAddMonster = (groupID: string | null) => {
		setAddTargetGroupID(groupID);
		setAddingMonsters(true);
	};

	const addGroup = () => {
		const copy = Utils.copy(encounter);
		const group = FactoryLogic.createEncounterGroup();
		copy.groups.push(group);
		setAddTargetGroupID(group.id);
		commit(copy);
		return group.id;
	};

	// One row per individual monster (including each minion in a squad) —
	// each tracks its own HP. Names are already disambiguated by
	// SessionLogic.startEncounter when needed, so we use m.name as-is.
	const buildGroupRows = (group: EncounterGroup): Row[] => {
		const rows: Row[] = [];
		group.slots.forEach(slot => {
			slot.monsters.forEach(m => {
				rows.push({
					kind: 'monster',
					rowID: m.id,
					groupID: group.id,
					slot,
					monster: m,
					name: m.name,
					statBlockKey: monsterBlockKey(slot.monsterID)
				});
			});
		});
		return rows;
	};

	const terrainRows: Row[] = encounter.terrain.flatMap(ts => ts.terrain).map(t => ({
		kind: 'terrain' as const,
		rowID: t.id,
		terrain: t,
		name: t.name || 'Terrain',
		statBlockKey: terrainBlockKey(t.id)
	}));

	// Right column: one stat block per unique monster type + per terrain piece.
	type StatBlock =
		| { key: string; kind: 'monster'; monster: Monster; name: string }
		| { key: string; kind: 'terrain'; terrain: Terrain; name: string };
	const statBlockMap = new Map<string, StatBlock>();
	encounter.groups.forEach(g => {
		g.slots.forEach(slot => {
			if (slot.monsters.length === 0) { return; }
			const key = monsterBlockKey(slot.monsterID);
			if (!statBlockMap.has(key)) {
				// Reference block reads as the species, not "Abyssal Hyena 1".
				// Prefer the source monster (sourcebook entry) so the title and
				// stats reflect the un-numbered template.
				const source = SourcebookLogic.getMonster(props.sourcebooks, slot.monsterID);
				const monster = source || slot.monsters[0];
				statBlockMap.set(key, { key, kind: 'monster', monster, name: monster.name });
			}
		});
	});
	encounter.terrain.flatMap(ts => ts.terrain).forEach(t => {
		const key = terrainBlockKey(t.id);
		if (!statBlockMap.has(key)) {
			statBlockMap.set(key, { key, kind: 'terrain', terrain: t, name: t.name || 'Terrain' });
		}
	});
	const statBlocks: StatBlock[] = Array.from(statBlockMap.values()).sort((a, b) => a.name.localeCompare(b.name));

	// What the malice counter beside it is for. The builder curates this list
	// per encounter via hiddenMaliceFeatures; until now nothing read that back,
	// so the abilities a director had picked were invisible during play.
	const maliceFeatures = EncounterLogic.getAllMaliceFeatures(encounter, props.sourcebooks)
		.map(group => ({
			group: group.group,
			features: group.features.filter(f => !encounter.hiddenMaliceFeatures.includes(f.id))
		}))
		.filter(group => group.features.length > 0);

	// Wide enough for three columns: the tracker keeps the left one and the
	// stat blocks take the other two, so twice as many are on screen at once.
	// They deal round-robin rather than first-half/second-half - the columns
	// scroll independently, so even heights matter more than reading order.
	const statBlockColumns: StatBlock[][] = (threeColumn && (statBlocks.length > 1)) ?
		[ statBlocks.filter((_, n) => n % 2 === 0), statBlocks.filter((_, n) => n % 2 === 1) ]
		: [ statBlocks ];

	const renderStatBlock = (c: StatBlock) => (
		<div
			key={c.key}
			ref={el => { blockRefs.current[c.key] = el; }}
			className={`stat-block ${focusedBlock === c.key ? 'focused' : ''}`}
		>
			{
				c.kind === 'monster' ?
					<MonsterPanel
						monster={c.monster}
						monsterGroup={SourcebookLogic.getMonsterGroup(props.sourcebooks, c.monster.id) || undefined}
						sourcebooks={props.sourcebooks}
						mode={PanelMode.Full}
						terse={true}
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
	);

	const renderHpControl = (row: Row) => {
		if (row.kind === 'terrain') {
			return null;
		}
		const max = MonsterLogic.getStamina(row.monster);
		const damage = row.monster.state.staminaDamage;
		const current = Math.max(0, max - damage);
		const apply = (delta: number) => {
			setMonsterStaminaDamage(row.monster.id, Math.max(0, damage - delta));
		};
		return (
			<div className='hp-control'>
				<Button type='text' size='small' className='hp-step hp-big' title='Take 5 damage' onClick={e => { e.stopPropagation(); apply(-5); }}>−5</Button>
				<Button type='text' size='small' className='hp-step' title='Take 1 damage' onClick={e => { e.stopPropagation(); apply(-1); }}>−1</Button>
				<div className='hp-display'>
					<span className='hp-current'>{current}</span>
					<span className='hp-sep'>/</span>
					<span className='hp-max'>{max}</span>
				</div>
				<Button type='text' size='small' className='hp-step' title='Heal 1' onClick={e => { e.stopPropagation(); apply(1); }}>+1</Button>
				<Button type='text' size='small' className='hp-step hp-big' title='Heal 5' onClick={e => { e.stopPropagation(); apply(5); }}>+5</Button>
			</div>
		);
	};

	const renderRow = (row: Row) => {
		const focused = focusedBlock === row.statBlockKey;
		const subtitle = row.kind === 'terrain'
			? 'Terrain'
			: MonsterLogic.getMonsterDescription(row.monster);
		return (
			<div
				key={row.rowID}
				className={[
					'tracker-row',
					focused ? 'focused' : '',
					row.kind === 'terrain' ? 'terrain' : ''
				].filter(Boolean).join(' ')}
				onClick={() => focusBlockByKey(row.statBlockKey)}
			>
				<div className='row-info'>
					<div className='row-name'>{row.name}</div>
					<div className='row-sub'>{subtitle}</div>
				</div>
				{renderHpControl(row)}
				<Button
					type='text'
					className='row-delete'
					icon={<DeleteOutlined />}
					title='Remove'
					onClick={e => {
						e.stopPropagation();
						if (row.kind === 'monster') {
							deleteMonster(row.monster.id);
						} else {
							deleteTerrain(row.rowID);
						}
					}}
				/>
			</div>
		);
	};

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
							<Button icon={<PlusOutlined />} onClick={() => openAddMonster(null)}>New group with monster…</Button>
							<Button
								icon={<ExportOutlined />}
								disabled={encounter.groups.length === 0}
								title='Get a copyable JSON blob for import into the vtt app'
								onClick={() => setShowVttExport(true)}
							>
								Export to VTT
							</Button>
						</div>

						<HeaderText level={2}>Combatants</HeaderText>

						{
							(encounter.groups.length === 0 && terrainRows.length === 0) ?
								<div className='ds-text dimmed-text centered-text'>No combatants yet — add a monster to begin.</div>
								:
								<div className='tracker-groups'>
									{
										encounter.groups.map((group, gIdx) => {
											const acted = group.encounterState === 'finished';
											const rows = buildGroupRows(group);
											const label = group.name || EncounterLogic.getDefaultGroupName(gIdx);
											const selected = group.id === addTargetGroupID;
											return (
												<div key={group.id} className={[ 'tracker-group', acted ? 'acted' : '', selected ? 'selected' : '' ].filter(Boolean).join(' ')}>
													<div className='group-header'>
														<Button
															type='text'
															className='acted-toggle'
															icon={acted ? <CheckCircleFilled /> : <CheckCircleOutlined />}
															title={acted ? 'Mark as not yet acted' : 'Mark as acted this round'}
															onClick={() => toggleGroupActed(group.id)}
														/>
														<div
															className='group-name selectable'
															title={selected ? 'Monsters you add land here' : 'Add monsters to this group'}
															onClick={() => setAddTargetGroupID(group.id)}
														>
															{label}
														</div>
														<Button
															type='text'
															className='group-add'
															icon={<PlusOutlined />}
															title='Add monster to this group'
															onClick={() => openAddMonster(group.id)}
														/>
														<Button
															type='text'
															className='group-delete'
															icon={<DeleteOutlined />}
															title='Remove group'
															onClick={() => deleteGroup(group.id)}
														/>
													</div>
													<div className='group-rows'>
														{rows.map(renderRow)}
													</div>
												</div>
											);
										})
									}
									{
										terrainRows.length > 0 ?
											<div className='tracker-group terrain-group'>
												<div className='group-header'>
													<div className='acted-toggle terrain-spacer' />
													<div className='group-name'>Terrain</div>
												</div>
												<div className='group-rows'>
													{terrainRows.map(renderRow)}
												</div>
											</div>
											: null
									}
								</div>
						}

						{
							maliceFeatures.length > 0 ?
								<div className='encounter-run-malice'>
									<HeaderText level={2}>Malice</HeaderText>
									{
										maliceFeatures.map(group => (
											<div key={group.group} className='malice-group'>
												<div className='malice-group-name'>{group.group}</div>
												{
													group.features.map(f => (
														<MalicePanel
															key={f.id}
															malice={f}
															currentMalice={encounter.malice}
															updateCurrentMalice={setMalice}
														/>
													))
												}
											</div>
										))
									}
								</div>
								: null
						}

						<HeaderText level={2}>Difficulty</HeaderText>
						<EncounterDifficultyPanel
							encounter={encounter}
							sourcebooks={props.sourcebooks}
							showHeader={false}
						/>
					</div>

					{
						statBlocks.length === 0 ?
							<div className='encounter-run-column encounter-run-stats'>
								<div className='ds-text dimmed-text centered-text'>Stat blocks will appear here as combatants are added.</div>
							</div>
							:
							statBlockColumns.map((column, n) => (
								<div key={n} className='encounter-run-column encounter-run-stats'>
									{column.map(renderStatBlock)}
								</div>
							))
					}
				</Flex>

				<Drawer open={addingMonsters} onClose={() => setAddingMonsters(false)} closeIcon={null} size={500}>
					<MonsterSelectModal
						monsters={props.sourcebooks.flatMap(sb => sb.monsterGroups).flatMap(g => g.monsters)}
						sourcebooks={props.sourcebooks}
						onClose={() => setAddingMonsters(false)}
						onSelect={addMonster}
					/>
				</Drawer>

				<Drawer open={showVttExport} onClose={() => setShowVttExport(false)} closeIcon={null} size={500}>
					<div className='vtt-export-panel'>
						<HeaderText level={1}>Export to VTT</HeaderText>
						<div className='ds-text dimmed-text'>
							Copy this and paste it into the vtt app's "Import" box on the Initiative Tracker.
						</div>
						<Input.TextArea
							rows={18}
							readOnly={true}
							value={VttExportLogic.toJson(encounter)}
							className='vtt-export-textarea'
							onFocus={e => e.target.select()}
						/>
						<Button type='primary' icon={<CopyOutlined />} onClick={copyVttExport}>
							{vttExportCopied ? 'Copied!' : 'Copy to Clipboard'}
						</Button>
					</div>
				</Drawer>
			</div>
		</ErrorBoundary>
	);
};
