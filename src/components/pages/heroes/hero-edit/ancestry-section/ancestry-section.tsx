import { Ancestry } from '@/models/ancestry';
import { AncestryPanel } from '@/components/panels/elements/ancestry-panel/ancestry-panel';
import { Element } from '@/models/element';
import { EmptyMessage } from '@/components/pages/heroes/hero-edit/empty-message/empty-message';
import { FeatureData } from '@/models/feature';
import { Hero } from '@/models/hero';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';

import './ancestry-section.scss';

const matchElement = (element: Element, searchTerm: string) => {
	const name = element.name.toLowerCase();
	const desc = element.description.toLowerCase();
	return searchTerm
		.toLowerCase()
		.split(' ')
		.some(token => name.includes(token) || desc.includes(token));
};

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	searchTerm: string;
	selectAncestry: (ancestry: Ancestry) => void;
	setFeatureData: (featureID: string, data: FeatureData) => void;
}

export const AncestrySection = (props: Props) => {
	const ancestries = SourcebookLogic.getAncestries(props.sourcebooks).map(Utils.copy).filter(a => matchElement(a, props.searchTerm));
	const options = ancestries.map(a => (
		<SelectablePanel key={a.id} onSelect={() => props.selectAncestry(a)}>
			<AncestryPanel ancestry={a} sourcebooks={props.sourcebooks} />
		</SelectablePanel>
	));

	return (
		<div className='hero-edit-content ancestry-section'>
			{
				props.hero.ancestry ?
					<div className='hero-edit-content-column selected single-column' id='ancestry-selected'>
						<AncestryPanel
							ancestry={props.hero.ancestry}
							sourcebooks={props.sourcebooks}
							hero={props.hero}
							mode={PanelMode.Full}
							setFeatureData={props.setFeatureData}
						/>
					</div>
					: null
			}
			{
				!props.hero.ancestry && (options.length > 0) ?
					<div className='hero-edit-content-column grid' id='ancestry-list'>
						{options}
					</div>
					: null
			}
			{
				!props.hero.ancestry && (options.length === 0) ?
					<div className='hero-edit-content-column' id='ancestry-list'>
						<EmptyMessage hero={props.hero} />
					</div>
					: null
			}
		</div>
	);
};
