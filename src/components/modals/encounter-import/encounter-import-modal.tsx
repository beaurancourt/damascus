import { Alert, Button, Flex, Input, Space, Tag } from 'antd';
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { DestinationSelector } from '@/components/pages/library/library-list/controls/destination-selector';
import { Encounter } from '@/models/encounter';
import { EncounterDifficultyLogic } from '@/logic/encounter-difficulty-logic';
import { EncounterLogic } from '@/logic/encounter-logic';
import { EncounterYamlLogic } from '@/logic/encounter-yaml';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Modal } from '@/components/modals/modal/modal';
import { Sourcebook } from '@/models/sourcebook';

import './encounter-import-modal.scss';

const EXAMPLE_YAML = `name: Goblin Ambush at the Coalroad
description: |
  Standard fight for 4 level-1 heroes.

groups:
  - name: Initial ambush
    slots:
      - monster: goblin-10
        count: 1
      - monster: goblin-9
        count: 3
      - monster: goblin-6
        count: 3

notes:
  tactics: |
    Cursespitters open from cover at 10+ squares; Warriors charge front line round 1.
  ending: |
    When the Monarch falls, surviving goblins flee.
`;

interface Props {
	sourcebooks: Sourcebook[];
	sourcebookID: string;
	setSourcebookID: (id: string) => void;
	onSave: (encounter: Encounter) => void;
	onRunLive: (encounter: Encounter) => void;
	onClose: () => void;
}

export const EncounterImportModal = (props: Props) => {
	const [ text, setText ] = useState('');
	const [ submitted, setSubmitted ] = useState(false);

	const result = useMemo(() => {
		if (!text.trim()) { return null; }
		return EncounterYamlLogic.parse(text, props.sourcebooks);
	}, [ text, props.sourcebooks ]);

	const errors = result?.issues.filter(i => i.severity === 'error') ?? [];
	const warnings = result?.issues.filter(i => i.severity === 'warning') ?? [];
	const encounter = result?.encounter ?? null;

	const evTotal = useMemo(() => {
		if (!encounter) { return 0; }
		return encounter.groups.reduce(
			(sum, g) => sum + EncounterDifficultyLogic.getGroupStrength(g, props.sourcebooks),
			0
		);
	}, [ encounter, props.sourcebooks ]);

	const renderSlotName = (monsterID: string): string => {
		const monster = EncounterLogic.getCustomizedMonster(
			monsterID,
			{ addOnIDs: [], itemIDs: [], levelAdjustment: 0, minionCountAdjustment: 0, convertToSolo: false },
			props.sourcebooks
		);
		return monster?.name ?? monsterID;
	};

	const handleSave = () => {
		if (!encounter) { return; }
		setSubmitted(true);
		props.onSave(encounter);
	};

	const handleRunLive = () => {
		if (!encounter) { return; }
		setSubmitted(true);
		props.onRunLive(encounter);
	};

	const content = (
		<div className='encounter-import-modal'>
			<HeaderText level={1}>Import Encounter from YAML</HeaderText>
			<div className='import-help'>
				Paste a YAML encounter (e.g. from the <code>encounter-builder</code> Claude skill).
				The importer validates monster IDs and computes EV automatically.
			</div>

			<DestinationSelector
				sourcebooks={props.sourcebooks}
				sourcebookID={props.sourcebookID}
				setSourcebookID={props.setSourcebookID}
			/>

			<Flex gap={12} wrap='wrap' className='import-body'>
				<div className='import-paste'>
					<Flex justify='space-between' align='center'>
						<HeaderText level={2}>YAML</HeaderText>
						<Button
							type='link'
							size='small'
							onClick={() => setText(EXAMPLE_YAML)}
						>
							Insert example
						</Button>
					</Flex>
					<Input.TextArea
						rows={18}
						placeholder='Paste your encounter YAML here…'
						value={text}
						onChange={e => setText(e.target.value)}
						className='yaml-textarea'
						spellCheck={false}
					/>
				</div>

				<div className='import-preview'>
					<HeaderText level={2}>Preview</HeaderText>

					{!text.trim() && (
						<div className='preview-empty'>
							Nothing to preview yet. Paste YAML or insert the example.
						</div>
					)}

					{errors.length > 0 && (
						<Alert
							type='error'
							showIcon={true}
							style={{ marginBottom: 12 }}
							title={`${errors.length} error${errors.length === 1 ? '' : 's'}`}
							description={
								<ul className='issue-list'>
									{errors.map((e, i) => (
										<li key={i}><code>{e.path}</code> — {e.message}</li>
									))}
								</ul>
							}
						/>
					)}

					{warnings.length > 0 && (
						<Alert
							type='warning'
							showIcon={true}
							style={{ marginBottom: 12 }}
							title={`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
							description={
								<ul className='issue-list'>
									{warnings.map((w, i) => (
										<li key={i}><code>{w.path}</code> — {w.message}</li>
									))}
								</ul>
							}
						/>
					)}

					{encounter && (
						<div className='preview-card'>
							<div className='preview-title'>
								<HeaderText level={2}>{encounter.name || '(unnamed)'}</HeaderText>
								<Tag color='blue'>EV {evTotal}</Tag>
							</div>
							{encounter.description && (
								<div className='preview-desc'>{encounter.description}</div>
							)}
							{encounter.groups.map(group => (
								<div key={group.id} className='preview-group'>
									<div className='group-header'>
										<b>{group.name}</b>
										{group.minHeroCount !== undefined && (
											<Tag>min heroes: {group.minHeroCount}</Tag>
										)}
										<Tag>EV {EncounterDifficultyLogic.getGroupStrength(group, props.sourcebooks)}</Tag>
									</div>
									<ul className='slot-list'>
										{group.slots.map(slot => (
											<li key={slot.id}>
												<span className='slot-count'>{slot.count}×</span>{' '}
												<span className='slot-name'>{renderSlotName(slot.monsterID)}</span>
												<span className='slot-id'>({slot.monsterID})</span>
												{slot.customization.levelAdjustment !== 0 && (
													<Tag>{slot.customization.levelAdjustment > 0 ? '+' : ''}{slot.customization.levelAdjustment} level</Tag>
												)}
												{slot.customization.convertToSolo && <Tag>solo</Tag>}
												{slot.customization.minionCountAdjustment > 0 && (
													<Tag>+{slot.customization.minionCountAdjustment} minions</Tag>
												)}
											</li>
										))}
									</ul>
								</div>
							))}
							{encounter.notes.length > 0 && (
								<div className='preview-notes'>
									{encounter.notes.map(note => (
										<div key={note.id} className='note'>
											<div className='note-title'>{note.name}</div>
											{note.description && <div className='note-body'>{note.description}</div>}
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</Flex>
		</div>
	);

	const toolbar = (
		<Space wrap={true}>
			<Button
				type='primary'
				icon={<SaveOutlined />}
				disabled={!encounter || submitted}
				onClick={handleSave}
			>
				Save to library
			</Button>
			<Button
				icon={<PlayCircleOutlined />}
				disabled={!encounter || submitted}
				onClick={handleRunLive}
			>
				Run live
			</Button>
		</Space>
	);

	return <Modal toolbar={toolbar} content={content} onClose={props.onClose} />;
};
