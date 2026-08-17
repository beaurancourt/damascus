import { Ability } from '@/models/ability';
import { AbilityKeyword } from '@/enums/ability-keyword';
import { AbilityLogic } from '@/logic/ability-logic';
import { AbilityUsage } from '@/enums/ability-usage';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Field } from '@/components/controls/field/field';
import { FormatLogic } from '@/logic/format-logic';
import { Hero } from '@/models/hero';
import { Markdown } from '@/components/controls/markdown/markdown';

import './ability-info-panel.scss';

interface Props {
	ability: Ability;
	hero?: Hero;
	// The encounter runner reads these banners at a glance during play, so it
	// asks for the short form: no field labels, and the action type without its
	// redundant "Action" suffix - "Main · Melee 1 · One creature or object".
	terse?: boolean;
}

const getUsageKind = (ability: Ability, hero?: Hero) => {
	if (ability.type.free) {
		return 'free';
	}
	const keywords = AbilityLogic.getKeywords(ability, hero);
	if (keywords.includes(AbilityKeyword.Performance)) {
		return 'perform';
	}
	switch (ability.type.usage) {
		case AbilityUsage.MainAction: return 'main';
		case AbilityUsage.Maneuver: return 'maneuver';
		case AbilityUsage.Trigger: return 'trigger';
		case AbilityUsage.Move: return 'move';
		case AbilityUsage.VillainAction: return 'villain';
		case AbilityUsage.ChampionAction: return 'champion';
	}
	return '';
};

export const AbilityInfoPanel = (props: Props) => {
	if ((props.ability.type.usage === AbilityUsage.NoAction) && (props.ability.distance.length === 0) && (props.ability.target === '') && (props.ability.type.trigger === '')) {
		return null;
	}

	const distance = props.ability.distance.map(d => AbilityLogic.getDistance(d, props.ability, props.hero)).join(' or ');
	const kind = getUsageKind(props.ability, props.hero);

	const abilityType = FormatLogic.getAbilityType(props.ability.type);
	const typeText = props.terse ? abilityType.replace(/ Action\b/, '') : abilityType;
	const label = (text: string) => props.terse ? '' : text;

	return (
		<ErrorBoundary>
			<div className={`ability-info-panel${kind ? ` kind-${kind}` : ''}`}>
				<div className='ds-text compact-text bold-text' style={{ position: 'relative', zIndex: '10' }}>
					{typeText}
				</div>
				{
					distance ?
						<Field
							compact={true}
							label={label(props.ability.target !== distance ? 'Distance' : 'Distance / Target')}
							value={<Markdown useSpan={true} text={distance} />}
						/>
						: null
				}
				{
					props.ability.target && (props.ability.target !== distance) ?
						<Field
							compact={true}
							label={label('Target')}
							value={<Markdown useSpan={true} text={props.ability.target} />}
						/>
						: null
				}
				{
					props.ability.type.trigger ?
						<Field
							compact={true}
							label='Trigger'
							value={<Markdown useSpan={true} text={props.ability.type.trigger} />}
						/>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
