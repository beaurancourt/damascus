import { Alert, Button, Popover, Segmented, Select, Space, Upload } from 'antd';
import { CodeOutlined, DownOutlined, DownloadOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Sourcebook, SourcebookElementKind } from '@/models/sourcebook';
import { useHeroes, useOptions } from '@/contexts/data-context';
import { Collections } from '@/utils/collections';
import { DestinationSelector } from '@/components/pages/library/library-list/controls/destination-selector';
import { Element } from '@/models/element';
import { EncounterData } from '@/data/encounter-data';
import { EncounterDifficulty } from '@/enums/encounter-difficulty';
import { EncounterDifficultyLogic } from '@/logic/encounter-difficulty-logic';
import { EncounterLogic } from '@/logic/encounter-logic';
import { Expander } from '@/components/controls/expander/expander';
import { FactoryLogic } from '@/logic/factory-logic';
import { OptionsLogic } from '@/logic/options-logic';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { useState } from 'react';

interface Props {
	category: SourcebookElementKind;
	sourcebooks: Sourcebook[];
	showMonsters: boolean;
	sourcebookID: string;
	setShowMonsters: (value: boolean) => void;
	setSourcebookID: (value: string) => void;
	createElement: (kind: SourcebookElementKind, sourcebookID: string, element: Element | null) => void;
	importElement: (kind: SourcebookElementKind, sourcebookID: string, element: Element) => void;
	showEncounterImport?: () => void;
}

export const AddBtn = (props: Props) => {
	const [ popoverOpen, setPopoverOpen ] = useState(false);
	const [ difficulty, setDifficulty ] = useState<EncounterDifficulty>(EncounterDifficulty.Standard);
	const [ keywords, setKeywords ] = useState<string[]>([]);
	const options = useOptions();
	const heroes = useHeroes();

	if ((props.category === 'monster-group') && props.showMonsters) {
		return (
			<Popover
				trigger='click'
				content={(
					<Alert
						type='info'
						showIcon={true}
						title='To create a new monster, switch to Group view.'
						action={<Button style={{ marginLeft: '5px' }} onClick={() => props.setShowMonsters(false)}>Switch</Button>}
					/>
				)}
			>
				<Button type='primary'>
					Add
					<DownOutlined />
				</Button>
			</Popover>
		);
	}

	const exampleEncounters = [
		EncounterData.goblinAmbush,
		EncounterData.dragonAttack
	];

	const generateEncounter = () => {
		const enc = FactoryLogic.createEncounter();

		const heroCount = OptionsLogic.getHeroCount(options, heroes);
		const heroLevel = OptionsLogic.getHeroLevel(options, heroes);

		const budgets = EncounterDifficultyLogic.getBudgets(options, heroes);
		switch (difficulty) {
			case EncounterDifficulty.Easy:
				EncounterLogic.generateEncounter(enc, props.sourcebooks, heroCount, keywords, budgets.maxTrivial, heroLevel, heroLevel + 1);
				break;
			case EncounterDifficulty.Standard:
				EncounterLogic.generateEncounter(enc, props.sourcebooks, heroCount, keywords, budgets.maxEasy, heroLevel, heroLevel + 1);
				break;
			case EncounterDifficulty.Hard:
				EncounterLogic.generateEncounter(enc, props.sourcebooks, heroCount, keywords, budgets.maxStandard, heroLevel, heroLevel + 2);
				break;
		}

		props.createElement(props.category, props.sourcebookID, enc);
	};

	const getOptions = () => {
		switch (props.category) {
			case 'encounter':
				return [
					props.showEncounterImport ? (
						<Button
							key='yaml-import'
							block={true}
							icon={<CodeOutlined />}
							onClick={() => {
								setPopoverOpen(false);
								props.showEncounterImport!();
							}}
						>
							Paste YAML (from Claude)
						</Button>
					) : null,
					<Expander key='premade' title='Use a premade example'>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
							{
								exampleEncounters.map(e => (
									<Button key={e.id} block={true} onClick={() => props.createElement(props.category, props.sourcebookID, e)}>{e.name}</Button>
								))
							}
						</div>
					</Expander>,
					<Expander key='random' title='Generate a random encounter'>
						<Segmented
							style={{ marginTop: '15px' }}
							block={true}
							options={[ EncounterDifficulty.Easy, EncounterDifficulty.Standard, EncounterDifficulty.Hard ]}
							value={difficulty}
							onChange={setDifficulty}
						/>
						<Select
							style={{ width: '100%', margin: '10px 0' }}
							mode='tags'
							placeholder='Use monsters with any keywords'
							options={Collections.sort(Collections.distinct(SourcebookLogic.getMonsters(props.sourcebooks).flatMap(m => m.keywords), kw => kw), kw => kw).map(kw => ({ value: kw, label: kw }))}
							optionRender={opt => <div className='ds-text'>{opt.data.value}</div>}
							value={keywords}
							onChange={setKeywords}

						/>
						<Button block={true} type='primary' icon={<ThunderboltOutlined />} onClick={generateEncounter}>Generate</Button>
					</Expander>

				];
			default:
				return [];
		}
	};

	return (
		<Popover
			trigger='click'
			open={popoverOpen}
			onOpenChange={setPopoverOpen}
			content={(
				<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '300px' }}>
					<DestinationSelector sourcebooks={props.sourcebooks} sourcebookID={props.sourcebookID} setSourcebookID={props.setSourcebookID} />
					<Space orientation='vertical' style={{ width: '100%' }}>
						<Button type='primary' block={true} icon={<PlusOutlined />} onClick={() => props.createElement(props.category, props.sourcebookID, null)}>Create</Button>
						<Upload
							style={{ width: '100%' }}
							accept={`.drawsteel-${props.category.toLowerCase()},.ds-${props.category.toLowerCase()}`}
							showUploadList={false}
							beforeUpload={file => {
								file
									.text()
									.then(json => {
										const e = JSON.parse(json) as Element;
										props.importElement(props.category, props.sourcebookID, e);
									});
								return false;
							}}
						>
							<Button block={true} icon={<DownloadOutlined />}>Import</Button>
						</Upload>
						{getOptions()}
					</Space>
				</div>
			)}
		>
			<Button type='primary'>
				Add
				<DownOutlined />
			</Button>
		</Popover>
	);
};
