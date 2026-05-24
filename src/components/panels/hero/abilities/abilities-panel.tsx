import { Ability } from '@/models/ability';
import { AbilityPanel } from '@/components/panels/elements/ability-panel/ability-panel';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { PanelMode } from '@/enums/panel-mode';
import { useOptions } from '@/contexts/data-context';

import './abilities-panel.scss';

interface Props {
	title: string;
	abilities: { ability: Ability, source: string, level: number | undefined }[];
	hero: Hero;
	onSelectAbility: (ability: Ability) => void;
}

export const AbilitiesPanel = (props: Props) => {
	const options = useOptions();

	if (props.abilities.length === 0) {
		return null;
	}

	const renderAbility = (a: { ability: Ability, source: string, level: number | undefined }) => (
		<AbilityPanel
			key={a.ability.id}
			ability={a.ability}
			hero={props.hero}
			mode={PanelMode.Full}
			tags={options.showSources ? [ a.level ? `${a.source} (level ${a.level})` : a.source ] : undefined}
		/>
	);

	const nonStandard = props.abilities.filter(a => a.source !== 'Standard');
	const standard = props.abilities.filter(a => a.source === 'Standard');

	return (
		<ErrorBoundary>
			<div className='abilities-section'>
				<HeaderText level={3}>{props.title}</HeaderText>
				{(nonStandard.length === 0) && (standard.length === 0) ? <Empty /> : null}
				{nonStandard.map(renderAbility)}
				{standard.map(renderAbility)}
			</div>
		</ErrorBoundary>
	);
};
