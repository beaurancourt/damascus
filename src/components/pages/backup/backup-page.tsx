import { Alert, Button, Space } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { DragEvent, useRef, useState } from 'react';
import { ImportData, ImportOutcome, createBackupBundle, parseImportEntries } from '@/logic/import-logic';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroOverviewPanel } from '@/components/panels/hero-overview/hero-overview-panel';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookPanel } from '@/components/panels/elements/sourcebook-panel/sourcebook-panel';
import { Utils } from '@/utils/utils';
import { useHeroes } from '@/contexts/data-context';

import './backup-page.scss';

interface Props {
	homebrewSourcebooks: Sourcebook[];
	importData: (data: ImportData) => Promise<ImportOutcome>;
}

interface Result {
	type: 'success' | 'warning' | 'error';
	text: string;
}

function describeOutcome(outcome: ImportOutcome, duplicateHeroes: number, duplicateSourcebooks: number): Result {
	const imported: string[] = [];
	if (outcome.importedHeroes > 0) {
		imported.push(`${outcome.importedHeroes} ${outcome.importedHeroes === 1 ? 'hero' : 'heroes'}`);
	}
	if (outcome.importedSourcebooks > 0) {
		imported.push(`${outcome.importedSourcebooks} ${outcome.importedSourcebooks === 1 ? 'sourcebook' : 'sourcebooks'}`);
	}

	const pieces: string[] = [];
	pieces.push(imported.length > 0 ? `Imported ${imported.join(' and ')}.` : 'Nothing new to import.');

	const skipped = outcome.skippedHeroes + outcome.skippedSourcebooks;
	if (skipped > 0) {
		pieces.push(`${skipped} item${skipped === 1 ? '' : 's'} already on this device ${skipped === 1 ? 'was' : 'were'} skipped.`);
	}

	const duplicates = duplicateHeroes + duplicateSourcebooks;
	if (duplicates > 0) {
		pieces.push(`${duplicates} duplicate${duplicates === 1 ? '' : 's'} in the selected files ${duplicates === 1 ? 'was' : 'were'} collapsed; the first copy was used.`);
	}

	if (outcome.missingSourcebookIDs.length > 0) {
		pieces.push(`These heroes reference sourcebooks that are not on this device: ${outcome.missingSourcebookIDs.join(', ')}. Import those sourcebook files too.`);
	}

	return {
		type: (imported.length === 0 || outcome.missingSourcebookIDs.length > 0) ? 'warning' : 'success',
		text: pieces.join(' ')
	};
}

export const BackupPage = (props: Props) => {
	const heroes = useHeroes();
	const [ importing, setImporting ] = useState<boolean>(false);
	const [ dragActive, setDragActive ] = useState<boolean>(false);
	const [ result, setResult ] = useState<Result | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const importFiles = async (files: File[]) => {
		if (files.length === 0) {
			return;
		}

		setImporting(true);
		setResult(null);
		try {
			const entries = await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() })));
			const parsed = parseImportEntries(entries);
			const outcome = await props.importData(parsed);
			setResult(describeOutcome(outcome, parsed.duplicateHeroes, parsed.duplicateSourcebooks));
		} catch (err) {
			setResult({ type: 'error', text: Utils.getErrorMessage(err) });
		} finally {
			setImporting(false);
		}
	};

	const onDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setDragActive(false);
		const files = Array.from(event.dataTransfer.files);
		if (files.length > 0) {
			void importFiles(files);
		}
	};

	const onDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setDragActive(true);
	};

	const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
		const related = event.relatedTarget as Node | null;
		if (!event.currentTarget.contains(related)) {
			setDragActive(false);
		}
	};

	const exportAll = () => {
		const date = new Date().toISOString().slice(0, 10);
		Utils.saveJson(createBackupBundle(heroes, props.homebrewSourcebooks), `damascus-backup-${date}`);
	};

	const total = heroes.length + props.homebrewSourcebooks.length;

	return (
		<ErrorBoundary>
			<div
				className='backup-page'
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				<div className='backup-page-header'>
					<div className='backup-page-heading'>
						<div className='backup-page-title'>Backup &amp; restore</div>
						<div className='backup-page-note'>
							Click a card to download one item. <strong>Export everything</strong> writes a single file for a new device; import it there with <strong>Import</strong>, or drop the file anywhere on this page.
						</div>
					</div>
					<Space wrap={true}>
						<Button type='primary' icon={<DownloadOutlined />} onClick={exportAll} disabled={total === 0}>Export everything</Button>
						<Button icon={<UploadOutlined />} loading={importing} onClick={() => fileRef.current?.click()}>Import</Button>
					</Space>
					<input
						ref={fileRef}
						type='file'
						accept='.json,.ds-hero,.ds-sourcebook,.drawsteel-hero,application/json'
						multiple={true}
						hidden={true}
						onChange={event => {
							const files = Array.from(event.target.files ?? []);
							event.target.value = '';
							if (files.length > 0) {
								void importFiles(files);
							}
						}}
					/>
				</div>
				<div className={dragActive ? 'backup-page-content dragging' : 'backup-page-content'}>
					{
						result ?
							<Alert
								className='backup-page-result'
								type={result.type}
								showIcon={true}
								title={result.text}
								closable={{ onClose: () => setResult(null) }}
							/>
							: null
					}
					{
						dragActive ?
							<div className='backup-page-drop'>Drop the files to import</div>
							: null
					}
					{
						heroes.map(hero => (
							<SelectablePanel key={hero.id} onSelect={() => Utils.exportData(hero.name || 'Unnamed Hero', hero, 'hero')}>
								<HeroOverviewPanel hero={HeroLogic.createOverview(hero)} />
							</SelectablePanel>
						))
					}
					{
						props.homebrewSourcebooks.map(sb => (
							<SelectablePanel key={sb.id} onSelect={() => Utils.exportData(sb.name || 'Unnamed Sourcebook', sb, 'sourcebook')}>
								<SourcebookPanel sourcebook={sb} sourcebooks={[]} />
							</SelectablePanel>
						))
					}
					{
						total === 0 ?
							<Empty text='Nothing to back up' />
							: null
					}
				</div>
			</div>
		</ErrorBoundary>
	);
};
