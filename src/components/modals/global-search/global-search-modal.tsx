import { Empty, Input, Tag } from 'antd';
import { GlobalSearchLogic, SearchEntry, SearchKind, labelForKind } from '@/logic/global-search-logic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Hero } from '@/models/hero';
import { Modal } from '@/components/modals/modal/modal';
import { RulesPage } from '@/enums/rules-page';
import { SearchOutlined } from '@ant-design/icons';
import { Sourcebook } from '@/models/sourcebook';
import { useNavigation } from '@/hooks/use-navigation';

import './global-search-modal.scss';

interface Props {
	sourcebooks: Sourcebook[];
	heroes: Hero[];
	onShowRule: (page: RulesPage, label?: string) => void;
	onClose: () => void;
}

const MAX_PER_KIND = 6;
const MAX_RESULTS = 60;

export const GlobalSearchModal = (props: Props) => {
	const [ query, setQuery ] = useState('');
	const navigation = useNavigation();
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		// Autofocus
		const t = setTimeout(() => inputRef.current?.focus(), 30);
		return () => clearTimeout(t);
	}, []);

	const { fuse, entries } = useMemo(
		() => GlobalSearchLogic.buildIndex(props.sourcebooks, props.heroes),
		[ props.sourcebooks, props.heroes ]
	);

	const grouped = useMemo(() => {
		const groups = new Map<SearchKind, SearchEntry[]>();
		if (query.trim().length < 2) {
			// Empty/short query — show a sampling of top entries (heroes + a few of each)
			const sample: SearchEntry[] = [];
			const byKind = new Map<SearchKind, number>();
			for (const e of entries) {
				const n = byKind.get(e.kind) ?? 0;
				if (n < 3) {
					byKind.set(e.kind, n + 1);
					sample.push(e);
				}
				if (sample.length >= 24) break;
			}
			sample.forEach(e => {
				if (!groups.has(e.kind)) groups.set(e.kind, []);
				groups.get(e.kind)!.push(e);
			});
			return groups;
		}

		const hits = fuse.search(query, { limit: MAX_RESULTS });
		hits.forEach(h => {
			const e = h.item;
			const list = groups.get(e.kind) ?? [];
			if (list.length < MAX_PER_KIND) {
				list.push(e);
				groups.set(e.kind, list);
			}
		});
		return groups;
	}, [ query, fuse, entries ]);

	const handlePick = (entry: SearchEntry) => {
		const target = entry.target;
		props.onClose();
		if (target.type === 'library') {
			navigation.goToLibrary(target.kind, target.id);
		} else if (target.type === 'hero') {
			navigation.goToHeroView(target.id);
		} else if (target.type === 'rule') {
			props.onShowRule(target.page, target.label);
		}
	};

	const KIND_ORDER: SearchKind[] = [
		'rule', 'condition',
		'hero',
		'monster', 'monster-group', 'encounter',
		'class', 'subclass', 'ancestry', 'career', 'culture', 'kit', 'complication',
		'item', 'domain', 'imbuement', 'perk', 'project', 'title',
		'adventure', 'montage', 'negotiation', 'terrain'
	];

	const visibleKinds = KIND_ORDER.filter(k => grouped.has(k) && grouped.get(k)!.length > 0);
	const hitCount = Array.from(grouped.values()).reduce((sum, list) => sum + list.length, 0);
	const showingShortQuery = query.trim().length < 2;

	const content = (
		<div className='global-search-modal'>
			<Input
				ref={inputRef as never}
				size='large'
				prefix={<SearchOutlined />}
				placeholder='Search heroes, monsters, items, encounters…'
				value={query}
				onChange={e => setQuery(e.target.value)}
				allowClear={true}
				autoFocus={true}
				onKeyDown={e => {
					if (e.key === 'Enter' && hitCount > 0) {
						const first = grouped.get(visibleKinds[0])![0];
						handlePick(first);
					} else if (e.key === 'Escape') {
						props.onClose();
					}
				}}
			/>

			{showingShortQuery && (
				<div className='search-hint'>
					Type 2+ characters to search. Fuzzy matching — typos OK.
					Indexed: {entries.length.toLocaleString()} items across heroes, monsters, library elements.
				</div>
			)}

			<div className='search-results'>
				{!showingShortQuery && hitCount === 0 && (
					<Empty description='No matches' />
				)}

				{visibleKinds.map(kind => {
					const list = grouped.get(kind)!;
					return (
						<div key={kind} className='search-group'>
							<div className='search-group-header'>
								<span>{labelForKind(kind)}</span>
								<Tag>{list.length}</Tag>
							</div>
							<ul className='search-list'>
								{list.map(entry => (
									<li key={entry.id}>
										<button
											type='button'
											className='search-result'
											onClick={() => handlePick(entry)}
										>
											<div className='result-name'>{entry.name}</div>
											{entry.subtitle && <div className='result-sub'>{entry.subtitle}</div>}
											{entry.description && <div className='result-desc'>{entry.description}</div>}
										</button>
									</li>
								))}
							</ul>
						</div>
					);
				})}
			</div>
		</div>
	);

	return <Modal content={content} onClose={props.onClose} />;
};
