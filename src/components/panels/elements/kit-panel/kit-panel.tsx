import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { Field } from '@/components/controls/field/field';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { Kit } from '@/models/kit';
import { Markdown } from '@/components/controls/markdown/markdown';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';

import './kit-panel.scss';

interface Props {
	kit: Kit;
	sourcebooks: Sourcebook[];
	hero?: Hero;
	mode?: PanelMode;
}

export const KitPanel = (props: Props) => {
	const tags = [];
	if (props.kit.type) {
		tags.push(props.kit.type);
	}
	if (props.sourcebooks.length > 0) {
		const sourcebookType = SourcebookLogic.getKitSourcebook(props.sourcebooks, props.kit)?.type || SourcebookType.Official;
		if (sourcebookType !== SourcebookType.Official) {
			tags.push(sourcebookType);
		}
	}

	if (props.mode !== PanelMode.Full) {
		return (
			<div className='kit-panel compact'>
				<HeaderText level={1} tags={tags}>
					{props.kit.name || 'Unnamed Kit'}
				</HeaderText>
				<Markdown text={props.kit.description} />
			</div>
		);
	}

	const kit = props.kit;

	return (
		<ErrorBoundary>
			<div className='kit-panel'>
				<HeaderText level={1} tags={tags}>{kit.name || 'Unnamed Kit'}</HeaderText>
				<Markdown text={kit.description} />
				<div className='kit-stats'>
					{kit.armor.length > 0 ? <Field label='Armor' value={kit.armor.join(', ')} /> : null}
					{kit.weapon.length > 0 ? <Field label='Weapon' value={kit.weapon.join(', ')} /> : null}
					{kit.stamina > 0 ? <Field label='Stamina' value={`+${kit.stamina}`} /> : null}
					{kit.speed > 0 ? <Field label='Speed' value={`+${kit.speed}`} /> : null}
					{kit.stability > 0 ? <Field label='Stability' value={`+${kit.stability}`} /> : null}
					{
						kit.meleeDamage ?
							<Field label='Melee Damage' value={`+${kit.meleeDamage.tier1} / +${kit.meleeDamage.tier2} / +${kit.meleeDamage.tier3}`} />
							: null
					}
					{
						kit.rangedDamage ?
							<Field label='Ranged Damage' value={`+${kit.rangedDamage.tier1} / +${kit.rangedDamage.tier2} / +${kit.rangedDamage.tier3}`} />
							: null
					}
					{kit.meleeDistance > 0 ? <Field label='Melee Distance' value={`+${kit.meleeDistance}`} /> : null}
					{kit.rangedDistance > 0 ? <Field label='Ranged Distance' value={`+${kit.rangedDistance}`} /> : null}
					{kit.disengage > 0 ? <Field label='Disengage' value={`+${kit.disengage}`} /> : null}
				</div>
				{kit.features.map(f => <FeaturePanel key={f.id} feature={f} hero={props.hero} sourcebooks={props.sourcebooks} mode={PanelMode.Full} />)}
			</div>
		</ErrorBoundary>
	);
};
