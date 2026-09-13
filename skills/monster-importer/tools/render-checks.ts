// Render checks: the only automated proof that a file shows up on screen. Runs
// the real panels through react-dom/server, so a file that would throw in an
// error boundary, or a malice feature that renders nowhere, fails here.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataManagerContext, HeroesContext, HomebrewSourcebooksContext, OptionsContext, SessionContext } from '@/contexts/data-context';
import { EncounterRunPanel } from '@/components/panels/run/encounter-run/encounter-run-panel';
import { FeatureType } from '@/enums/feature-type';
import { Format } from '@/utils/format';
import { FormatLogic } from '@/logic/format-logic';
import { MonsterGroupPanel } from '@/components/panels/elements/monster-group-panel/monster-group-panel';
import { MonsterPanel } from '@/components/panels/elements/monster-panel/monster-panel';
import { Monster } from '@/models/monster';
import { MonsterGroup } from '@/models/monster-group';
import { Options } from '@/models/options';
import { PanelMode } from '@/enums/panel-mode';
import { FactoryLogic } from '@/logic/factory-logic';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';
import { Report } from './monster-checks';

const options = { abilityAutoCalc: false } as Options;
const session = FactoryLogic.createSession();
const dataManagerStub = new Proxy({}, { get: () => () => Promise.resolve() }) as never;

// The panels are browser components. The runner reaches for window.matchMedia
// on its first render, so shim the few globals it touches.
export const installDomShims = () => {
	const noop = () => null;
	const g = globalThis as unknown as Record<string, unknown>;
	g.window = g.window || {
		matchMedia: () => ({ matches: false, media: '', onchange: null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
		addEventListener: noop,
		removeEventListener: noop,
		innerWidth: 1200,
		innerHeight: 800
	};
	g.ResizeObserver = class { observe() { return null; } unobserve() { return null; } disconnect() { return null; } };
	g.IntersectionObserver = class { observe() { return null; } unobserve() { return null; } disconnect() { return null; } };
};

// Renders with every context the panels read, then flattens to text so checks
// read like assertions about the screen.
const renderText = (element: React.ReactElement, label: string, report: Report): string => {
	let tree: React.ReactElement = React.createElement(OptionsContext.Provider, { value: options }, element);
	tree = React.createElement(HeroesContext.Provider, { value: [] }, tree);
	tree = React.createElement(HomebrewSourcebooksContext.Provider, { value: [] }, tree);
	tree = React.createElement(SessionContext.Provider, { value: session }, tree);
	tree = React.createElement(DataManagerContext.Provider, { value: dataManagerStub }, tree);
	try {
		const html = renderToStaticMarkup(tree);
		return html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
	} catch (error) {
		report.fail(`${label}: threw while rendering (${(error as Error).message})`);
		return '';
	}
};

export const checkStatBlockRenders = (report: Report, monster: Monster, group: MonsterGroup | undefined, label: string) => {
	const sourcebooks = SourcebookLogic.getSourcebooks([]);
	const text = renderText(React.createElement(MonsterPanel, { monster: Utils.copy(monster), monsterGroup: group, sourcebooks, mode: PanelMode.Full }), `${label}: stat block`, report);
	if (!text) {
		return;
	}

	report.ok(`${label}: stat block renders`);
	report.check(`${label}: stat block shows the name`, text.includes(monster.name), `"${monster.name}" missing`);
	report.check(`${label}: stat block shows the level line`, text.includes(`Level ${monster.level}`));
	report.check(`${label}: stat block shows the keywords`, monster.keywords.every(k => text.includes(k)));
	report.check(`${label}: stat block shows the size`, text.includes(FormatLogic.getSize(monster.size)));
	report.check(`${label}: stat block shows the free strike`, text.includes(`${monster.freeStrikeDamage}`));

	monster.speed.modes.forEach(mode => {
		report.check(`${label}: stat block shows "Movement: ${Format.capitalize(mode)}"`, text.includes(Format.capitalize(mode)));
	});

	monster.features.filter(f => f.type === FeatureType.Text).forEach(f => {
		report.check(`${label}: stat block shows the trait "${f.name}"`, text.includes(f.name));
	});

	monster.features.filter(f => f.type === FeatureType.Ability).forEach(f => {
		report.check(`${label}: stat block shows the ability "${f.name}"`, text.includes(f.name));
	});

	monster.features.filter(f => f.type === FeatureType.DamageModifier).forEach(f => {
		f.data.modifiers.forEach(m => {
			// The panel prints "Immunities: Fire 2" / "Weaknesses: Cold 3".
			report.check(`${label}: stat block shows the ${m.type.toLowerCase()} ${m.damageType} ${m.value}`, text.includes(`${m.damageType} ${m.value}`));
		});
	});

	// A monster-owned malice ability is deliberately absent from the stat block;
	// say so rather than letting it look like a bug in the file.
	monster.features.filter(f => f.type === FeatureType.MaliceAbility || f.type === FeatureType.Malice).forEach(f => {
		report.check(`${label}: monster-owned malice "${f.name}" is absent from the stat block (expected)`, !text.includes(f.name));
	});
};

export const checkGroupEntryRenders = (report: Report, group: MonsterGroup, label: string) => {
	const sourcebooks = SourcebookLogic.getSourcebooks([]);
	const text = renderText(React.createElement(MonsterGroupPanel, { monsterGroup: Utils.copy(group), sourcebooks, mode: PanelMode.Full }), `${label}: group entry`, report);
	if (!text) {
		return;
	}

	report.ok(`${label}: group entry renders`);
	report.check(`${label}: group entry shows the group name`, text.includes(group.name));
	group.malice.forEach(m => report.check(`${label}: group entry lists the malice "${m.name}"`, text.includes(m.name)));
	group.monsters.forEach(m => report.check(`${label}: group entry lists the monster "${m.name}"`, text.includes(m.name)));
};

export const checkRendersInRunner = (report: Report, group: MonsterGroup, label: string) => {
	const sourcebook = FactoryLogic.createSourcebook();
	sourcebook.name = 'Skill Check';
	sourcebook.monsterGroups = [ Utils.copy(group) ];
	const sourcebooks = SourcebookLogic.getSourcebooks([ sourcebook ]);

	const encounter = FactoryLogic.createEncounter();
	encounter.name = 'Skill Check';
	encounter.malice = 10;
	const encounterGroup = FactoryLogic.createEncounterGroup();
	encounterGroup.name = 'Wave';
	const slot = FactoryLogic.createEncounterSlot(group.monsters[0].id);
	slot.monsters = [ Utils.copy(group.monsters[0]) ];
	encounterGroup.slots = [ slot ];
	encounter.groups = [ encounterGroup ];

	const text = renderText(React.createElement(EncounterRunPanel, { encounter, sourcebooks, onChange: () => null }), `${label}: encounter runner`, report);
	if (!text) {
		return;
	}

	report.ok(`${label}: encounter runner renders`);
	report.check(`${label}: runner shows the monster`, text.includes(group.monsters[0].name));
	group.malice.forEach(m => {
		// This is the check that proves malice is playable, not just stored.
		report.check(`${label}: runner offers the malice "${m.name}" to spend`, text.includes(m.name));
	});
};
