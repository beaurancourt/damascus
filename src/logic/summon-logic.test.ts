import { describe, expect, it } from 'vitest';
import { FactoryLogic } from '@/logic/factory-logic';
import { HeroLogic } from '@/logic/hero-logic';
import { MonsterOrganizationType } from '@/enums/monster-organization-type';
import { MonsterRoleType } from '@/enums/monster-role-type';
import { SummonLogic } from '@/logic/summon-logic';

const createMinionSummon = () => {
	return FactoryLogic.createSummon({
		monster: FactoryLogic.createMonster({
			id: 'test-minion',
			name: 'Test Minion',
			level: 0,
			role: FactoryLogic.createMonsterRole(MonsterOrganizationType.Minion, MonsterRoleType.Brute),
			keywords: [],
			encounterValue: 0,
			size: FactoryLogic.createSize(1),
			speed: FactoryLogic.createSpeed(5),
			stamina: 2,
			stability: 0,
			freeStrikeDamage: 2,
			characteristics: FactoryLogic.createCharacteristics(2, 0, -1, -1, -1),
			features: []
		}),
		isSignature: true,
		cost: 1,
		count: 1
	});
};

describe('SummonLogic formation bonuses', () => {
	it('returns no bonuses when the hero has no formation', () => {
		const hero = FactoryLogic.createHero([]);
		expect(HeroLogic.getMinionFormationBonuses(hero)).toEqual({ staminaBonus: 0, stabilityBonus: 0 });
	});

	it('sums the bonuses from the hero\'s chosen formation', () => {
		const hero = FactoryLogic.createHero([]);
		hero.features.push(FactoryLogic.feature.createSummonFormation({
			id: 'test-elite',
			name: 'Elite Formation',
			staminaBonus: 3,
			stabilityBonus: 1
		}));

		expect(HeroLogic.getMinionFormationBonuses(hero)).toEqual({ staminaBonus: 3, stabilityBonus: 1 });
	});

	it('applies the formation bonuses to a summoned minion\'s stats', () => {
		const hero = FactoryLogic.createHero([]);
		hero.features.push(FactoryLogic.feature.createSummonFormation({
			id: 'test-elite',
			name: 'Elite Formation',
			staminaBonus: 3,
			stabilityBonus: 1
		}));

		const monster = SummonLogic.getSummonedMonster(
			createMinionSummon(),
			hero,
			HeroLogic.getMinionFormationBonuses(hero)
		);

		expect(monster.stamina).toBe(5);
		expect(monster.stability).toBe(1);
	});

	it('does not apply formation bonuses to non-minions', () => {
		const hero = FactoryLogic.createHero([]);
		hero.features.push(FactoryLogic.feature.createSummonFormation({
			id: 'test-elite',
			name: 'Elite Formation',
			staminaBonus: 3,
			stabilityBonus: 1
		}));

		const summon = createMinionSummon();
		summon.monster.role = FactoryLogic.createMonsterRole(MonsterOrganizationType.Retainer, MonsterRoleType.Brute);

		const monster = SummonLogic.getSummonedMonster(
			summon,
			hero,
			HeroLogic.getMinionFormationBonuses(hero)
		);

		expect(monster.stamina).toBe(2);
		expect(monster.stability).toBe(0);
	});
});
