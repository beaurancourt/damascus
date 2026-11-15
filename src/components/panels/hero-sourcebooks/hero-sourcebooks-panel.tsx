import { Collections } from '@/utils/collections';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Markdown } from '@/components/controls/markdown/markdown';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';
import { Space } from 'antd';
import { Toggle } from '@/components/controls/toggle/toggle';

import './hero-sourcebooks-panel.scss';

interface Props {
	sourcebooks: Sourcebook[];
	sourcebookIDs: string[];
	onChange: (sourcebookIDs: string[]) => void;
}

const TYPE_ORDER = [ SourcebookType.Official, SourcebookType.Homebrew ];

const hasContent = (sourcebook: Sourcebook) => {
	return (SourcebookLogic.getElements(sourcebook).length > 0)
		|| (sourcebook.skills.length > 0)
		|| (sourcebook.languages.length > 0);
};

export const HeroSourcebooksPanel = (props: Props) => {
	const toggleSourcebook = (include: boolean, id: string) => {
		const ids = include
			? [ ...props.sourcebookIDs, id ]
			: props.sourcebookIDs.filter(i => i !== id);
		props.onChange(ids);
	};

	const groups = TYPE_ORDER
		.map(type => ({
			type,
			sourcebooks: Collections.sort(
				props.sourcebooks.filter(sb => (sb.type === type) && hasContent(sb)),
				sb => sb.name || 'Unnamed Sourcebook'
			)
		}))
		.filter(group => group.sourcebooks.length > 0);

	return (
		<div className='hero-sourcebooks-panel'>
			<HeaderText>Sourcebooks</HeaderText>
			<div className='ds-text'>
				This hero can use content from the following sourcebooks.
			</div>
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					groups.map(group => (
						<div key={group.type} className='sourcebook-type-section'>
							<HeaderText level={3}>{group.type} Sourcebooks</HeaderText>
							{
								group.sourcebooks.map(sb => (
									<Toggle
										key={sb.id}
										label={<Field label={sb.name || 'Unnamed Sourcebook'} value={<Markdown text={sb.description} useSpan={true} />} />}
										value={props.sourcebookIDs.includes(sb.id)}
										onChange={value => toggleSourcebook(value, sb.id)}
									/>
								))
							}
						</div>
					))
				}
			</Space>
			<div className='ds-text hero-sourcebooks-note'>
				Homebrew sourcebooks you import from Backup &amp; restore appear here. Turn one on to use its ancestries, classes, abilities and equipment in this hero.
			</div>
		</div>
	);
};
