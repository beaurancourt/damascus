import { MonsterInfo, TerrainInfo } from '@/components/panels/token/token';
import { useHeroes, useOptions } from '@/contexts/data-context';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { CreatureLogic } from '@/logic/creature-logic';
import { Empty } from '@/components/controls/empty/empty';
import { Encounter } from '@/models/encounter';
import { EncounterDifficultyLogic } from '@/logic/encounter-difficulty-logic';
import { EncounterDifficultyPanel } from '@/components/panels/encounter-difficulty/encounter-difficulty-panel';
import { EncounterLogic } from '@/logic/encounter-logic';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { FeatureType } from '@/enums/feature-type';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Markdown } from '@/components/controls/markdown/markdown';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterPanel } from '@/components/panels/elements/monster-panel/monster-panel';
import { OptionsLogic } from '@/logic/options-logic';
import { PanelMode } from '@/enums/panel-mode';
import { Pill } from '@/components/controls/pill/pill';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';
import { Space } from 'antd';
import { TerrainPanel } from '@/components/panels/elements/terrain-panel/terrain-panel';

import './encounter-panel.scss';

interface Props {
	encounter: Encounter;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
	showTools?: (tool: string) => void;
}

export const EncounterPanel = (props: Props) => {
	const options = useOptions();
	const heroes = useHeroes();

	const heroCount = OptionsLogic.getHeroCount(options, heroes);
	const strength = EncounterDifficultyLogic.getStrength(props.encounter, props.sourcebooks, heroCount);
	const difficulty = EncounterDifficultyLogic.getDifficulty(strength, options, heroes);

	const tags = [];
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getEncounterSourcebook(props.sourcebooks, props.encounter)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}
	tags.push(difficulty);

	const getOverview = () => {
		return (
			<>
				<Markdown text={props.encounter.description} />
				<EncounterDifficultyPanel encounter={props.encounter} sourcebooks={props.sourcebooks} />
				{props.encounter.notes.map(note => <Field key={note.id} label={note.name} value={<Markdown text={note.description} useSpan={true} />} />)}
			</>
		);
	};

	const getEncounterGroups = () => {
		const groups = props.encounter.groups
			.filter(g => {
				const minHeroes = g.minHeroCount || heroCount;
				return heroCount >= minHeroes;
			})
			.filter(g => g.slots.length > 0);

		if ((groups.length === 0) && (props.encounter.terrain.length === 0)) {
			return (
				<Empty text='No monsters or terrain' />
			);
		}

		return (
			<div className='encounter-groups'>
				{
					groups.map(group => (
						<SelectablePanel key={group.id} style={{ paddingTop: '0' }}>
							{
								groups.length > 1 ?
									<HeaderText>{group.name || EncounterLogic.getDefaultGroupName(props.encounter.groups.findIndex(g => g.id === group.id))}</HeaderText>
									:
									<HeaderText>Monsters</HeaderText>
							}
							<Space orientation='vertical'>
								{
									group.slots.map(slot => {
										const monster = EncounterLogic.getCustomizedMonster(slot.monsterID, slot.customization, props.sourcebooks);
										if (!monster) {
											return null;
										}

										const count = (slot.count * MonsterLogic.getRoleMultiplier(monster.role.organization)) + slot.customization.minionCountAdjustment;

										return (
											<div key={slot.id} className='encounter-slot'>
												<MonsterInfo monster={monster} />
												{count > 1 ? <Pill>x{count}</Pill> : null}
											</div>
										);
									})
								}
								{
									group.slots.length === 0 ?
										<Empty />
										: null
								}
							</Space>
						</SelectablePanel>
					))
				}
				{
					props.encounter.terrain.length > 0 ?
						<SelectablePanel key='terrain' style={{ paddingTop: '0' }}>
							<HeaderText>Terrain</HeaderText>
							<Space orientation='vertical'>
								{
									props.encounter.terrain.map(slot => {
										const terrain = SourcebookLogic.getTerrains(props.sourcebooks).find(t => t.id === slot.terrainID);
										if (!terrain) {
											return null;
										}

										return (
											<div key={slot.id} className='terrain-slot'>
												<TerrainInfo terrain={terrain} />
												{slot.count > 1 ? <Pill>x{slot.count}</Pill> : null}
											</div>
										);
									})
								}
							</Space>
						</SelectablePanel>
						: null
				}
			</div>
		);
	};

	const getStatBlocks = () => {
		const monsterData = EncounterLogic.getMonsterData(props.encounter);
		if ((monsterData.length === 0) && (props.encounter.terrain.length === 0)) {
			return null;
		}

		return (
			<>
				<div className='encounter-stat-blocks'>
					{
						monsterData.map(data => {
							const monster = EncounterLogic.getCustomizedMonster(data.monsterID, data.customization, props.sourcebooks);
							const monsterGroup = SourcebookLogic.getMonsterGroup(props.sourcebooks, data.monsterID);
							if (monster && monsterGroup) {
								return (
									<MonsterPanel
										key={monster.id}
										monster={monster}
										monsterGroup={monsterGroup}
										sourcebooks={props.sourcebooks}
										mode={PanelMode.Full}
									/>
								);
							}

							return null;
						})
					}
					{
						props.encounter.terrain.map(slot => {
							const terrain = SourcebookLogic.getTerrains(props.sourcebooks).find(t => t.id === slot.terrainID);
							if (terrain) {
								return (
									<TerrainPanel
										key={terrain.id}
										terrain={terrain}
										upgradeIDs={slot.upgradeIDs}
										sourcebooks={props.sourcebooks}
										mode={PanelMode.Full}
									/>
								);
							}
							return null;
						})
					}
				</div>
			</>
		);
	};

	const getMalice = () => {
		const monsterGroups = EncounterLogic.getMonsterGroups(props.encounter, props.sourcebooks);
		if (monsterGroups.length === 0) {
			return null;
		}

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					monsterGroups.filter(group => group.malice.length > 0).map(group => {
						let maxEchelon = 1;
						props.encounter.groups.forEach(g => {
							g.slots.forEach(s => {
								const monster = group.monsters.find(m => m.id === s.monsterID);
								if (monster) {
									const echelon = CreatureLogic.getEchelon(monster.level);
									maxEchelon = Math.max(maxEchelon, echelon);
								}
							});
						});

						return (
							<div key={group.id}>
								<HeaderText level={1}>{group.name} Malice</HeaderText>
								<div className='encounter-malice'>
									{
										group.malice
											.filter(m => {
												let echelon = 1;
												switch (m.type) {
													case FeatureType.Malice:
													case FeatureType.MaliceAbility:
														echelon = m.data.echelon;
														break;
												}
												return echelon <= maxEchelon;
											})
											.map(m => {
												let cost = undefined;
												switch (m.type) {
													case FeatureType.Malice:
														cost = m.data.cost;
														break;
													case FeatureType.MaliceAbility:
														cost = m.data.ability.cost;
														break;
												}
												return (
													<SelectablePanel key={m.id}>
														<FeaturePanel
															feature={m}
															mode={PanelMode.Full}
															cost={cost}
															repeatable={m.type === FeatureType.Malice ? m.data.repeatable : undefined}
														/>
													</SelectablePanel>
												);
											})
									}
								</div>
							</div>
						);
					})
				}
			</Space>
		);
	};

	// Sections stacked rather than tabbed: a library entry is something you read,
	// and two thirds of it being one click away made you click to find out
	// whether there was anything there.
	const getContent = () => {
		return (
			<>
				{getOverview()}
				<HeaderText level={2}>Groups</HeaderText>
				{getEncounterGroups()}
				<HeaderText level={2}>Stat Blocks</HeaderText>
				{getStatBlocks()}
				<HeaderText level={2}>Malice</HeaderText>
				{getMalice()}
			</>
		);
	};

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='encounter-panel compact'>
				<HeaderText
					level={1}
					tags={tags}
				>
					{props.encounter.name || 'Unnamed Encounter'}
				</HeaderText>
				<Markdown text={props.encounter.description} />
			</div>
		);
	}

	return (
		<ErrorBoundary>
			<div className='encounter-panel'>
				<HeaderText
					level={1}
					tags={tags}
					extra={
						props.showTools ?
							<ButtonGroup
								buttons={[
									{ type: 'button', label: 'Minis', onClick: () => props.showTools!('minis') }
								]}
							/>
							: null
					}
				>
					{props.encounter.name || 'Unnamed Encounter'}
				</HeaderText>
				{getContent()}
			</div>
		</ErrorBoundary>
	);
};
