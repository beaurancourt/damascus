import { describe, expect, it } from 'vitest';
import { FactoryLogic } from '@/logic/factory-logic';
import { FeatureField } from '@/enums/feature-field';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { LeveledItemData } from '@/data/items/leveled-item-data';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';

// A hero's max stamina comes from their kit plus any Stamina bonuses: the bonuses
// on an item in their inventory (the Bloodbound Band carries +6), and the ones the
// customize screen hands out. Everything downstream reads it back through
// getStamina, so a change has to move all of it together.
const buildHero = (): Hero => {
	const sourcebooks = SourcebookLogic.getSourcebooks([]);
	const hero = FactoryLogic.createHero([]);
	hero.class = Utils.copy(sourcebooks.flatMap(sb => sb.classes).find(c => c.id === 'class-fury')!);
	const kit = sourcebooks.flatMap(sb => sb.kits)[0];
	const kitChoice = FactoryLogic.feature.createKitChoice({ id: 'test-kit' });
	kitChoice.data.selected = [ Utils.copy(kit) ];
	hero.features.push(kitChoice);
	return hero;
};

const thresholds = (hero: Hero) => ({
	max: HeroLogic.getStamina(hero),
	recovery: HeroLogic.getRecoveryValue(hero),
	winded: HeroLogic.getWindedThreshold(hero),
	dead: HeroLogic.getDeadThreshold(hero)
});

describe('max stamina', () => {
	it('carries a stamina bonus into recovery, winded and death', () => {
		const hero = buildHero();
		const before = thresholds(hero);

		hero.features.push(FactoryLogic.feature.createBonus({
			id: 'test-stamina-bonus',
			field: FeatureField.Stamina,
			value: 6
		}));

		const after = thresholds(hero);
		expect(after.max).toBe(before.max + 6);
		expect(after.recovery).toBe(Math.floor(after.max / 3));
		expect(after.recovery).toBeGreaterThan(before.recovery);
		expect(after.winded).toBe(Math.floor(after.max / 2));
		expect(after.dead).toBe(-after.winded);
	});

	it('takes the bonus from an equipped item too', () => {
		const hero = buildHero();
		const before = thresholds(hero);

		hero.state.inventory.push(Utils.copy(LeveledItemData.bloodboundBand));

		const after = thresholds(hero);
		expect(after.max).toBe(before.max + 6);
		expect(after.recovery).toBe(Math.floor(after.max / 3));
		expect(after.winded).toBe(Math.floor(after.max / 2));
		expect(after.dead).toBe(-after.winded);
	});

	it('reports the state those thresholds describe', () => {
		const hero = buildHero();
		hero.features.push(FactoryLogic.feature.createBonus({
			id: 'test-stamina-bonus',
			field: FeatureField.Stamina,
			value: 6
		}));

		const max = HeroLogic.getStamina(hero);
		hero.state.staminaDamage = 0;
		expect(HeroLogic.getCombatState(hero)).toBe('healthy');

		hero.state.staminaDamage = max - HeroLogic.getWindedThreshold(hero);
		expect(HeroLogic.getCombatState(hero)).toBe('winded');

		hero.state.staminaDamage = max - 0;
		expect(HeroLogic.getCombatState(hero)).toBe('dying');

		hero.state.staminaDamage = max - HeroLogic.getDeadThreshold(hero);
		expect(HeroLogic.getCombatState(hero)).toBe('dead');
	});
});
