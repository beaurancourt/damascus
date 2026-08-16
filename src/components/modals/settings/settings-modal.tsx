import { Button, Drawer, Segmented, Select, Space } from 'antd';
import { MoonOutlined, SettingOutlined, SunOutlined } from '@ant-design/icons';
import { useDataManager, useHeroes, useOptions } from '@/contexts/data-context';
import { AbilityData } from '@/data/ability-data';
import { AppMode } from '@/utils/app-mode';
import { Collections } from '@/utils/collections';
import { Expander } from '@/components/controls/expander/expander';
import { Field } from '@/components/controls/field/field';
import { LabelControl } from '@/components/controls/label-control/label-control';
import { Modal } from '@/components/modals/modal/modal';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Options } from '@/models/options';
import { StandardAbilitySelectModal } from '@/components/modals/select/standard-ability-select/standard-ability-select-modal';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';
import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';

import pbds from '@/assets/powered-by-draw-steel.png';
import pkg from '../../../../package.json';

import './settings-modal.scss';

interface Props {
	onClose: () => void;
}

export const SettingsModal = (props: Props) => {
	const { themeMode, setTheme } = useTheme();
	const [ options, setOptions ] = useState<Options>(Utils.copy(useOptions()));
	const [ standardAbilitiesMode, setStandardAbilitiesMode ] = useState<string>(() => {
		if (options.shownStandardAbilities.length === 0) { return 'none'; }
		if (options.shownStandardAbilities.length === AbilityData.standardAbilities.length) { return 'all'; }
		return 'custom';
	});
	const [ showAbilitySelector, setShowAbilitySelector ] = useState<boolean>(false);

	const heroes = useHeroes();
	const dataManager = useDataManager();
	const saveOptions = (next: Options) => {
		dataManager.saveOptions(next);
	};
	const updateOption = <K extends keyof Options>(key: K, value: Options[K]) => {
		const copy = Utils.copy(options);
		copy[key] = value;
		setOptions(copy);
		saveOptions(copy);
	};

	const getAppearance = () => (
		<Expander title='Appearance'>
			<Segmented
				block={true}
				value={themeMode}
				onChange={setTheme}
				options={[
					{ label: 'Light', value: 'light', icon: <SunOutlined /> },
					{ label: 'System', value: 'system', icon: <SettingOutlined /> },
					{ label: 'Dark', value: 'dark', icon: <MoonOutlined /> }
				]}
			/>
		</Expander>
	);

	const getHeroesSection = () => {
		const setShownStandardAbilities = (value: string | string[]) => {
			updateOption('shownStandardAbilities', [ value ].flat(1));
		};

		const onModeChange = (value: string) => {
			setStandardAbilitiesMode(value);
			switch (value) {
				case 'none': setShownStandardAbilities([]); break;
				case 'custom': setShowAbilitySelector(true); break;
				case 'all': setShownStandardAbilities(AbilityData.standardAbilities.map(a => a.id)); break;
			}
		};

		const closeStandardAbilitiesModal = () => {
			if (options.shownStandardAbilities.length === 0) { setStandardAbilitiesMode('none'); }
			else if (options.shownStandardAbilities.length === AbilityData.standardAbilities.length) { setStandardAbilitiesMode('all'); }
			else { setStandardAbilitiesMode('custom'); }
			setShowAbilitySelector(false);
		};

		return (
			<Expander title='Heroes'>
				<Space orientation='vertical' style={{ width: '100%' }}>
					<NumberSpin
						label='XP per level'
						min={1}
						value={options.xpPerLevel}
						onChange={v => updateOption('xpPerLevel', v)}
					/>
					<Toggle
						label='Show skills in groups'
						value={options.showSkillsInGroups}
						onChange={v => updateOption('showSkillsInGroups', v)}
					/>
					<Toggle
						label='Show feature / ability sources'
						value={options.showSources}
						onChange={v => updateOption('showSources', v)}
					/>
					<Toggle
						label='Single-page view'
						value={options.singlePage}
						onChange={v => updateOption('singlePage', v)}
					/>
					<Toggle
						label='Compact'
						value={options.compactView}
						onChange={v => updateOption('compactView', v)}
					/>
					<Toggle
						label='Auto-calculate ability damage'
						value={options.abilityAutoCalc}
						onChange={v => updateOption('abilityAutoCalc', v)}
					/>
					<div>
						<LabelControl
							label='Show standard abilities'
							control={
								<Segmented
									block={true}
									options={[
										{ value: 'none', label: 'None' },
										{ value: 'custom', label: 'Custom' },
										{ value: 'all', label: 'All' }
									]}
									value={standardAbilitiesMode}
									onChange={onModeChange}
								/>
							}
						/>
						{
							standardAbilitiesMode === 'custom' ?
								<Button block={true} onClick={() => setShowAbilitySelector(true)}>Select Abilities</Button>
								: null
						}
					</div>
				</Space>
				<Drawer open={showAbilitySelector} onClose={closeStandardAbilitiesModal} closeIcon={null} size={500}>
					<StandardAbilitySelectModal
						abilityIDs={options.shownStandardAbilities}
						onSelect={setShownStandardAbilities}
						onClose={closeStandardAbilitiesModal}
					/>
				</Drawer>
			</Expander>
		);
	};

	const getEncountersSection = () => {
		const parties = Collections.distinct(heroes.map(h => h.folder), f => f).sort().filter(f => !!f);
		return (
			<Expander title='Encounters'>
				<Space orientation='vertical' style={{ width: '100%' }}>
					<Toggle
						label='Show defeated combatants'
						value={options.showDefeatedCombatants}
						onChange={v => updateOption('showDefeatedCombatants', v)}
					/>
					{
						parties.length > 0
							? (
								<LabelControl
									label='Start encounters with'
									control={
										<Select
											style={{ width: '100%' }}
											placeholder='Select a party'
											options={[ '', ...parties ].map(p => ({ value: p, label: p || 'No heroes' }))}
											optionRender={option => <div className='ds-text'>{option.data.label}</div>}
											value={options.party}
											onChange={p => updateOption('party', p || '')}
										/>
									}
								/>
							)
							: null
					}
				</Space>
			</Expander>
		);
	};

	const getDifficultySection = () => {
		const parties = Collections.distinct(heroes.map(h => h.folder), f => f).sort().filter(f => !!f);
		return (
			<Expander title='Encounter / Montage Difficulty'>
				<Space orientation='vertical' style={{ width: '100%' }}>
					<LabelControl
						label='Calculate difficulty based on these heroes'
						control={
							<Select
								style={{ width: '100%' }}
								placeholder='Select a party'
								options={[ ...parties, '' ].map(p => ({ value: p, label: p || 'A custom party' }))}
								optionRender={option => <Field label={option.data.label} value='' />}
								value={options.heroParty}
								onChange={p => updateOption('heroParty', p || '')}
							/>
						}
					/>
					{
						options.heroParty === ''
							? (
								<>
									<NumberSpin
										label='Number of heroes'
										min={1}
										value={options.heroCount}
										onChange={v => updateOption('heroCount', v)}
									/>
									<NumberSpin
										label='Hero level'
										min={1}
										max={10}
										value={options.heroLevel}
										onChange={v => updateOption('heroLevel', v)}
									/>
									<NumberSpin
										label='Number of victories'
										min={0}
										value={options.heroVictories}
										onChange={v => updateOption('heroVictories', v)}
									/>
								</>
							)
							: null
					}
				</Space>
			</Expander>
		);
	};

	// The DRAW STEEL Creator License and the glyph font's CC BY-SA terms both
	// require their notices to travel with the app, so they live here now that
	// there's no About section to hold them.
	const getNotices = () => {
		return (
			<div className='settings-notices'>
				<div className='notice-logo'>
					<img src={pbds} alt='Powered by Draw Steel' />
				</div>
				<div>
					<b>DAMASCUS</b> is an independent product published under the DRAW STEEL Creator License and is not affiliated with MCDM Productions, LLC.
				</div>
				<div>
					<b>DRAW STEEL</b> © 2024 <a href='https://mcdmproductions.com/' target='_blank'>MCDM Productions, LLC.</a>
				</div>
				<div>
					<a href='https://mcdm.gg/DrawSteel/DrawSteelGlyphs.zip' target='_blank'>Draw Steel Glyphs Font</a> by <a href='https://mcdmproductions.com/' target='_blank'>MCDM Productions</a> is licensed under <a href='https://creativecommons.org/licenses/by-sa/4.0/' target='_blank'>CC BY-SA 4.0</a>.
				</div>
				<div>
					A fork of <a href='https://github.com/andyaiken/forgesteel' target='_blank'>Forge Steel</a> by Andy Aiken. <a href='https://github.com/beaurancourt/damascus' target='_blank'>Source</a>, <a href='https://github.com/beaurancourt/damascus/issues' target='_blank'>issues</a>. Version {pkg.version}.
				</div>
			</div>
		);
	};

	return (
		<Modal
			content={
				<div className='settings-modal'>
					<Space orientation='vertical' style={{ width: '100%' }}>
						{getAppearance()}
						{getHeroesSection()}
						{
							// Both of these configure running an encounter, which is
							// the GM site's job; on the player site they were settings
							// for a screen that isn't there.
							AppMode.hasSession ?
								<>
									{getEncountersSection()}
									{getDifficultySection()}
								</>
								: null
						}
						{getNotices()}
					</Space>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
