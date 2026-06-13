import { Career } from '@/models/career';
import { CareerPanel } from '@/components/panels/elements/career-panel/career-panel';
import { Element } from '@/models/element';
import { EmptyMessage } from '@/components/pages/heroes/hero-edit/empty-message/empty-message';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeatureData } from '@/models/feature';
import { Hero } from '@/models/hero';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';

import './career-section.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	selectCareer: (career: Career) => void;
	selectIncitingIncident: (value: Element | null) => void;
	setFeatureData: (featureID: string, data: FeatureData) => void;
}

export const CareerSection = (props: Props) => {
	const careers = SourcebookLogic.getCareers(props.sourcebooks).map(Utils.copy);
	const options = careers.map(c => (
		<SelectablePanel key={c.id} onSelect={() => props.selectCareer(c)}>
			<CareerPanel career={c} sourcebooks={props.sourcebooks} />
		</SelectablePanel>
	));

	return (
		<ErrorBoundary>
			<div className='hero-edit-content career-section'>
				{
					props.hero.career ?
						<div className='hero-edit-content-column selected single-column' id='career-selected'>
							<CareerPanel
								career={props.hero.career}
								sourcebooks={props.sourcebooks}
								hero={props.hero}
								mode={PanelMode.Full}
								setFeatureData={props.setFeatureData}
								onSelectIncitingIncident={props.selectIncitingIncident}
							/>
						</div>
						: null
				}
				{
					!props.hero.career && (options.length > 0) ?
						<div className='hero-edit-content-column grid' id='career-list'>
							{options}
						</div>
						: null
				}
				{
					!props.hero.career && (options.length === 0) ?
						<div className='hero-edit-content-column' id='career-list'>
							<EmptyMessage hero={props.hero} />
						</div>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
