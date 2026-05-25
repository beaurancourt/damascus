import Fuse from 'fuse.js';
import { ConditionLogic } from '@/logic/condition-logic';
import { ConditionType } from '@/enums/condition-type';
import { Hero } from '@/models/hero';
import { RulesData } from '@/data/rules-data';
import { RulesPage } from '@/enums/rules-page';
import { Sourcebook, SourcebookElementKind } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';

export interface SearchEntry {
	id: string;
	kind: SearchKind;
	name: string;
	subtitle?: string;
	description?: string;
	// For navigating: library uses (kind, id); heroes use heroID directly.
	target:
		| { type: 'library'; kind: SourcebookElementKind; id: string }
		| { type: 'hero'; id: string }
		| { type: 'rule'; page: RulesPage; label?: string };
}

export type SearchKind =
	| 'hero'
	| 'ancestry'
	| 'career'
	| 'class'
	| 'subclass'
	| 'culture'
	| 'complication'
	| 'domain'
	| 'imbuement'
	| 'item'
	| 'kit'
	| 'perk'
	| 'project'
	| 'title'
	| 'monster'
	| 'monster-group'
	| 'encounter'
	| 'adventure'
	| 'montage'
	| 'negotiation'
	| 'terrain'
	| 'rule'
	| 'condition';

const KIND_LABEL: Record<SearchKind, string> = {
	hero: 'Heroes',
	ancestry: 'Ancestries',
	career: 'Careers',
	class: 'Classes',
	subclass: 'Subclasses',
	culture: 'Cultures',
	complication: 'Complications',
	domain: 'Domains',
	imbuement: 'Imbuements',
	item: 'Items',
	kit: 'Kits',
	perk: 'Perks',
	project: 'Projects',
	title: 'Titles',
	monster: 'Monsters',
	'monster-group': 'Monster Groups',
	encounter: 'Encounters',
	adventure: 'Adventures',
	montage: 'Montages',
	negotiation: 'Negotiations',
	terrain: 'Terrain',
	rule: 'Rules',
	condition: 'Conditions'
};

const ALL_RULES = [
	RulesData.abilityDistance,
	RulesData.abilityTarget,
	RulesData.assist,
	RulesData.burrowing,
	RulesData.climbingAndSwimming,
	RulesData.concealment,
	RulesData.cover,
	RulesData.crawling,
	RulesData.criticalHit,
	RulesData.damageAndEffect,
	RulesData.damagingTerrain,
	RulesData.difficultTerrain,
	RulesData.duringTheMove,
	RulesData.dyingAndDeath,
	RulesData.falling,
	RulesData.flanking,
	RulesData.flying,
	RulesData.forcedMovement,
	RulesData.hiding,
	RulesData.highGround,
	RulesData.hover,
	RulesData.invisibility,
	RulesData.jumping,
	RulesData.mainAction,
	RulesData.mountedCombat,
	RulesData.movement,
	RulesData.naturalRoll,
	RulesData.opportunityAttack,
	RulesData.rollVsMultipleCreatures,
	RulesData.shifting,
	RulesData.slammingCreatures,
	RulesData.slammingObjects,
	RulesData.sneaking,
	RulesData.suffocating,
	RulesData.surprise,
	RulesData.takingATurn,
	RulesData.teleporting,
	RulesData.underwaterCombat,
	RulesData.wieldingTreasures
];

const ALL_CONDITIONS: ConditionType[] = [
	ConditionType.Bleeding,
	ConditionType.Dazed,
	ConditionType.Frightened,
	ConditionType.Grabbed,
	ConditionType.Prone,
	ConditionType.Restrained,
	ConditionType.Slowed,
	ConditionType.Taunted,
	ConditionType.Weakened
];

// Aliases: words that appear inside a rule's content but aren't its label.
// Surface these as quick hits even when they're buried deep in the content.
const RULE_KEYWORDS: { keywords: string[]; label: string }[] = [
	{ keywords: [ 'push', 'pull', 'slide' ], label: RulesData.forcedMovement.label },
	{ keywords: [ 'shove' ], label: RulesData.forcedMovement.label },
	{ keywords: [ 'edge', 'bane' ], label: RulesData.naturalRoll.label },
	{ keywords: [ 'free strike' ], label: RulesData.opportunityAttack.label }
];

export const labelForKind = (kind: SearchKind) => KIND_LABEL[kind];

const stripMarkdown = (text: string | undefined | null): string | undefined => {
	if (!text) return undefined;
	return text
		.replace(/[*_`~#>]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 220);
};

export class GlobalSearchLogic {
	static buildIndex(sourcebooks: Sourcebook[], heroes: Hero[]): { fuse: Fuse<SearchEntry>; entries: SearchEntry[] } {
		const entries: SearchEntry[] = [];

		const push = (
			kind: SearchKind,
			id: string,
			name: string,
			description: string | undefined,
			target: SearchEntry['target'],
			subtitle?: string
		) => {
			if (!name) return;
			entries.push({ id: `${kind}:${id}`, kind, name, description: stripMarkdown(description), subtitle, target });
		};

		// Heroes
		heroes.forEach(h => {
			const klass = h.class?.name ?? '';
			const ancestry = h.ancestry?.name ?? '';
			const sub = [ ancestry, klass ].filter(Boolean).join(' · ') || h.folder;
			push('hero', h.id, h.name || 'Unnamed hero', undefined, { type: 'hero', id: h.id }, sub);
		});

		// Library categories
		SourcebookLogic.getAncestries(sourcebooks).forEach(e => push('ancestry', e.id, e.name, e.description, { type: 'library', kind: 'ancestry', id: e.id }));
		SourcebookLogic.getCareers(sourcebooks).forEach(e => push('career', e.id, e.name, e.description, { type: 'library', kind: 'career', id: e.id }));
		SourcebookLogic.getClasses(sourcebooks).forEach(e => push('class', e.id, e.name, e.description, { type: 'library', kind: 'class', id: e.id }));
		SourcebookLogic.getSubclasses(sourcebooks, true).forEach(e => push('subclass', e.id, e.name, e.description, { type: 'library', kind: 'subclass', id: e.id }));
		SourcebookLogic.getCultures(sourcebooks, true).forEach(e => push('culture', e.id, e.name, e.description, { type: 'library', kind: 'culture', id: e.id }));
		SourcebookLogic.getComplications(sourcebooks).forEach(e => push('complication', e.id, e.name, e.description, { type: 'library', kind: 'complication', id: e.id }));
		SourcebookLogic.getDomains(sourcebooks).forEach(e => push('domain', e.id, e.name, e.description, { type: 'library', kind: 'domain', id: e.id }));
		SourcebookLogic.getImbuements(sourcebooks).forEach(e => push('imbuement', e.id, e.name, e.description, { type: 'library', kind: 'imbuement', id: e.id }));
		SourcebookLogic.getItems(sourcebooks).forEach(e => push('item', e.id, e.name, e.description, { type: 'library', kind: 'item', id: e.id }));
		SourcebookLogic.getKits(sourcebooks).forEach(e => push('kit', e.id, e.name, e.description, { type: 'library', kind: 'kit', id: e.id }));
		SourcebookLogic.getPerks(sourcebooks).forEach(e => push('perk', e.id, e.name, e.description, { type: 'library', kind: 'perk', id: e.id }));
		SourcebookLogic.getProjects(sourcebooks, true, true).forEach(e => push('project', e.id, e.name, e.description, { type: 'library', kind: 'project', id: e.id }));
		SourcebookLogic.getTitles(sourcebooks).forEach(e => push('title', e.id, e.name, e.description, { type: 'library', kind: 'title', id: e.id }));

		// Director-side
		SourcebookLogic.getAdventures(sourcebooks).forEach(e => push('adventure', e.id, e.name, e.description, { type: 'library', kind: 'adventure', id: e.id }));
		SourcebookLogic.getEncounters(sourcebooks).forEach(e => push('encounter', e.id, e.name, e.description, { type: 'library', kind: 'encounter', id: e.id }));
		SourcebookLogic.getMontages(sourcebooks).forEach(e => push('montage', e.id, e.name, e.description, { type: 'library', kind: 'montage', id: e.id }));
		SourcebookLogic.getNegotiations(sourcebooks).forEach(e => push('negotiation', e.id, e.name, e.description, { type: 'library', kind: 'negotiation', id: e.id }));
		SourcebookLogic.getTerrains(sourcebooks).forEach(e => push('terrain', e.id, e.name, e.description, { type: 'library', kind: 'terrain', id: e.id }));

		// Monster groups and individual monsters
		SourcebookLogic.getMonsterGroups(sourcebooks).forEach(g => {
			push('monster-group', g.id, g.name, g.description, { type: 'library', kind: 'monster-group', id: g.id });
			g.monsters.forEach(m => {
				const role = m.role ? `${m.role.organization} ${m.role.type ?? ''}`.trim() : '';
				const sub = [ `L${m.level}`, role, `EV ${m.encounterValue}` ].filter(Boolean).join(' · ');
				push('monster', m.id, m.name || 'Unnamed monster', undefined, { type: 'library', kind: 'monster-group', id: g.id }, `${g.name} · ${sub}`);
			});
		});

		// Rules — index label as name + content as description, so deep terms like "push" inside forcedMovement hit
		ALL_RULES.forEach(r => {
			entries.push({
				id: `rule:${r.label}`,
				kind: 'rule',
				name: r.label,
				description: stripMarkdown(r.content),
				target: { type: 'rule', page: RulesPage.Rules, label: r.label }
			});
		});

		// Aliases — synthetic entries so common terms (push/pull/slide/edge/bane) surface the right rule by name
		RULE_KEYWORDS.forEach(({ keywords, label }) => {
			keywords.forEach(keyword => {
				const display = keyword.charAt(0).toUpperCase() + keyword.slice(1);
				entries.push({
					id: `rule-alias:${keyword}`,
					kind: 'rule',
					name: display,
					subtitle: `see ${label}`,
					target: { type: 'rule', page: RulesPage.Rules, label }
				});
			});
		});

		// Conditions
		ALL_CONDITIONS.forEach(ct => {
			entries.push({
				id: `condition:${ct}`,
				kind: 'condition',
				name: ct,
				description: stripMarkdown(ConditionLogic.getDescription(ct)),
				target: { type: 'rule', page: RulesPage.Conditions, label: ct }
			});
		});

		const fuse = new Fuse(entries, {
			keys: [
				{ name: 'name', weight: 0.7 },
				{ name: 'subtitle', weight: 0.2 },
				{ name: 'description', weight: 0.1 }
			],
			threshold: 0.35,
			ignoreLocation: true,
			minMatchCharLength: 2,
			includeScore: true
		});

		return { fuse, entries };
	}
}
