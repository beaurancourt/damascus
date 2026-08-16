import { useEffect, useRef } from 'react';
import { AbilityData } from '@/data/ability-data';
import { AbilityPanel } from '@/components/panels/elements/ability-panel/ability-panel';
import { AbilityUsage } from '@/enums/ability-usage';
import { ConditionLogic } from '@/logic/condition-logic';
import { ConditionType } from '@/enums/condition-type';
import { Empty } from '@/components/controls/empty/empty';
import { Field } from '@/components/controls/field/field';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { LanguageType } from '@/enums/language-type';
import { Markdown } from '@/components/controls/markdown/markdown';
import { Modal } from '@/components/modals/modal/modal';
import { PanelMode } from '@/enums/panel-mode';
import { RulesData } from '@/data/rules-data';
import { RulesItem } from '@/models/rules-item';
import { RulesPage } from '@/enums/rules-page';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { SkillList } from '@/enums/skill-list';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Space } from 'antd';

import './reference-modal.scss';

interface Props {
	hero: Hero | null;
	sourcebooks: Sourcebook[];
	startPage?: RulesPage;
	startRule?: string;
	onClose: () => void;
}

export const ReferenceModal = (props: Props) => {
	const rulesScrollRef = useRef<HTMLDivElement | null>(null);

	const slugify = (label: string) =>
		label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	const ruleSlug = (label: string) => 'rule-' + slugify(label);
	const conditionSlug = (label: string) => 'condition-' + slugify(label);
	// Skills and languages are searchable now, so a search hit has to be able to
	// land on the row itself rather than the top of the section.
	const skillSlug = (label: string) => 'skill-' + slugify(label);
	const languageSlug = (label: string) => 'language-' + slugify(label);

	// Rewrite plain-text mentions of a rule label as markdown anchor links
	// (e.g. "Forced Movement" → "[Forced Movement](#rule-forced-movement)") so
	// readers can jump from one rule's content into the rule it references.
	//
	// Safeguards: skip labels that already appear inside an existing markdown link
	// (`[...](...)`) or inline code spans, and skip the rule's own label so a rule
	// doesn't self-link.
	// Linkify rule + condition references in markdown content so the reader can
	// jump between them. Targets carry a `kind` so the anchor href can use the
	// right id (rule-<slug> vs condition-<slug>).
	const linkifyReferences = (
		content: string,
		currentLabel: string,
		targets: { label: string; kind: 'rule' | 'condition' }[]
	) => {
		if (!content) { return content; }
		// Sort longest-first so e.g. "Slamming Into Creatures" matches before
		// "Slamming", and "Forced Movement" matches before "Movement".
		const sorted = targets
			.filter(t => t.label !== currentLabel)
			.sort((a, b) => b.label.length - a.label.length);

		// Mask existing links and inline code so the regex doesn't double-wrap or
		// touch code samples. We'll restore them after the substitutions.
		const placeholders: string[] = [];
		const mask = (text: string, regex: RegExp) => text.replace(regex, m => {
			const i = placeholders.length;
			placeholders.push(m);
			return `\x00${i}\x00`;
		});
		let masked = content;
		masked = mask(masked, /\[[^\]]*\]\([^)]*\)/g); // existing markdown links
		masked = mask(masked, /`[^`\n]*`/g); // inline code

		for (const target of sorted) {
			const escaped = target.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const slug = target.kind === 'rule' ? ruleSlug(target.label) : conditionSlug(target.label);
			masked = masked.replace(
				new RegExp(`\\b${escaped}\\b`, 'gi'),
				match => {
					// Wrap as a markdown link AND immediately mask it so shorter labels
					// later in the pass can't match inside this link's text or href.
					const link = `[${match}](#${slug})`;
					const i = placeholders.length;
					placeholders.push(link);
					return `\x00${i}\x00`;
				}
			);
		}

		// Restore masked spans. The sentinel is \x00 — intentional.
		// eslint-disable-next-line no-control-regex
		return masked.replace(/\x00(\d+)\x00/g, (_match, i) => placeholders[Number(i)]);
	};

	// Intercept clicks on in-doc anchor links so they scroll within the modal
	// (the browser default would scroll the window, which doesn't match here).
	const handleDocClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		const anchor = target.closest('a') as HTMLAnchorElement | null;
		if (!anchor) { return; }
		const href = anchor.getAttribute('href');
		if (!href || !(href.startsWith('#rule-') || href.startsWith('#condition-') || href.startsWith('#section-'))) { return; }
		const el = document.getElementById(href.slice(1));
		if (!el) { return; }
		event.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const sectionSlug = (page: RulesPage) => {
		switch (page) {
			case RulesPage.Conditions: return 'section-conditions';
			case RulesPage.Skills: return 'section-skills';
			case RulesPage.Languages: return 'section-languages';
			case RulesPage.Abilities: return 'section-abilities';
			case RulesPage.Rules:
			default: return 'section-rules';
		}
	};

	// On mount, scroll to the requested rule/condition anchor (or section, if no label given).
	useEffect(() => {
		let target: string | null = null;
		if (props.startRule) {
			// Try rule first, then condition (since both are passed via this prop).
			// One label prop carries all four kinds, so try each slug in turn.
			const candidates = [
				ruleSlug(props.startRule),
				conditionSlug(props.startRule),
				skillSlug(props.startRule),
				languageSlug(props.startRule)
			];
			target = candidates.find(id => document.getElementById(id))
				?? (props.startPage ? sectionSlug(props.startPage) : candidates[0]);
		} else if (props.startPage) {
			target = sectionSlug(props.startPage);
		}
		if (!target) { return; }
		const t = setTimeout(() => {
			const el = document.getElementById(target!);
			if (el) { el.scrollIntoView({ behavior: 'auto', block: 'start' }); }
		}, 80);
		return () => clearTimeout(t);
	}, []);

	const getRulesSection = () => {
		const rules = [
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

		// Sort by page number ascending (rules without a page sink to the bottom).
		const ordered = rules.slice().sort((a, b) => {
			const pa = a.page ?? Number.MAX_SAFE_INTEGER;
			const pb = b.page ?? Number.MAX_SAFE_INTEGER;
			if (pa !== pb) { return pa - pb; }
			return a.label.localeCompare(b.label);
		});

		// This panel browses; searching is the global search's job. It used to
		// filter with a substring match of its own, which behaved differently
		// from the fuzzy, ranked search everywhere else and only ever looked
		// inside the section you were already on.
		const visible = ordered;

		const conditionTypes: ConditionType[] = [
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
		const linkTargets: { label: string; kind: 'rule' | 'condition' }[] = [
			...rules.map(r => ({ label: r.label, kind: 'rule' as const })),
			...conditionTypes.map(c => ({ label: c, kind: 'condition' as const }))
		];
		const ruleLabelSet = new Set(rules.map(r => r.label));

		// Pre-process the ordered rules into a flat list of render entries:
		// section headers, virtual sub-headings (PDF ancestors that aren't rules
		// in our data), and the rules themselves. Maintains an "active ancestors"
		// stack so each entry's heading depth matches its position in the PDF.
		type Entry =
			| { kind: 'section'; label: string }
			| { kind: 'virtual'; label: string; depth: number }
			| { kind: 'rule'; rule: RulesItem; depth: number };
		const entries: Entry[] = [];
		let activeAncestors: string[] = [];
		let currentSection: string | undefined;

		for (const r of visible) {
			if (r.section && r.section !== currentSection) {
				entries.push({ kind: 'section', label: r.section });
				currentSection = r.section;
				activeAncestors = [];
			}

			const ancestors = r.ancestors || [];
			// Find common prefix with the active ancestor stack.
			let common = 0;
			while (
				common < ancestors.length &&
				common < activeAncestors.length &&
				ancestors[common] === activeAncestors[common]
			) {
				common++;
			}
			// Pop the diverging tail.
			activeAncestors = activeAncestors.slice(0, common);
			// Push and emit any new ancestors. Skip emitting a virtual heading
			// for ancestors that are themselves rules — they get emitted as rule entries.
			for (let i = common; i < ancestors.length; i++) {
				const anc = ancestors[i];
				activeAncestors.push(anc);
				if (!ruleLabelSet.has(anc)) {
					entries.push({ kind: 'virtual', label: anc, depth: i });
				}
			}

			entries.push({ kind: 'rule', rule: r, depth: ancestors.length });
			activeAncestors.push(r.label);
		}

		return (
			<div id={sectionSlug(RulesPage.Rules)}>
				{
					visible.length === 0 ? <Empty text='No matches' /> : null
				}
				{
					entries.map((entry, idx) => {
						if (entry.kind === 'section') {
							return <h2 key={`s-${idx}`} className='rules-section-heading'>{entry.label}</h2>;
						}
						if (entry.kind === 'virtual') {
							const HeadingTag = `h${Math.min(6, 3 + entry.depth)}` as 'h3' | 'h4' | 'h5' | 'h6';
							return (
								<div key={`v-${idx}-${entry.label}`} className={`rules-entry virtual depth-${entry.depth}`}>
									<HeadingTag className='rules-entry-heading'>{entry.label}</HeadingTag>
								</div>
							);
						}
						const r = entry.rule;
						const HeadingTag = `h${Math.min(6, 3 + entry.depth)}` as 'h3' | 'h4' | 'h5' | 'h6';
						return (
							<div key={r.label} id={ruleSlug(r.label)} className={`rules-entry depth-${entry.depth}`}>
								<HeadingTag className='rules-entry-heading'>
									{r.label}
									{r.page ? <span className='rules-entry-page'>p.{r.page}</span> : null}
								</HeadingTag>
								<Markdown text={linkifyReferences(r.content, r.label, linkTargets)} />
							</div>
						);
					})
				}
			</div>
		);
	};

	const getConditionsSection = () => {
		const conditions = [
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
		const visible = conditions;
		if (visible.length === 0) { return null; }

		const allRules = [
			RulesData.abilityDistance, RulesData.abilityTarget, RulesData.assist, RulesData.burrowing, RulesData.climbingAndSwimming, RulesData.concealment, RulesData.cover, RulesData.crawling, RulesData.criticalHit, RulesData.damageAndEffect, RulesData.damagingTerrain, RulesData.difficultTerrain, RulesData.duringTheMove, RulesData.dyingAndDeath, RulesData.falling, RulesData.flanking, RulesData.flying, RulesData.forcedMovement, RulesData.hiding, RulesData.highGround, RulesData.hover, RulesData.invisibility, RulesData.jumping, RulesData.mainAction, RulesData.mountedCombat, RulesData.movement, RulesData.naturalRoll, RulesData.opportunityAttack, RulesData.rollVsMultipleCreatures, RulesData.shifting, RulesData.slammingCreatures, RulesData.slammingObjects, RulesData.sneaking, RulesData.suffocating, RulesData.surprise, RulesData.takingATurn, RulesData.teleporting, RulesData.underwaterCombat, RulesData.wieldingTreasures
		];
		const linkTargets: { label: string; kind: 'rule' | 'condition' }[] = [
			...allRules.map(r => ({ label: r.label, kind: 'rule' as const })),
			...conditions.map(c => ({ label: c, kind: 'condition' as const }))
		];

		return (
			<div id={sectionSlug(RulesPage.Conditions)} className='rules-entry'>
				<h2 className='rules-section-heading'>Conditions</h2>
				{
					visible.map(ct => (
						<div key={ct} id={conditionSlug(ct)} className='rules-entry depth-1'>
							<h3 className='rules-entry-heading'>{ct}</h3>
							<Markdown text={linkifyReferences(ConditionLogic.getDescription(ct), ct, linkTargets)} />
						</div>
					))
				}
			</div>
		);
	};

	const getSkillsSection = () => {
		const sourcebooks = props.hero ? props.hero.sourcebookIDs.map(id => props.sourcebooks.find(s => s.id === id)).filter(s => !!s) : props.sourcebooks;
		const allSkills = SourcebookLogic.getSkills(sourcebooks);
		const skillNames = props.hero ? HeroLogic.getSkills(props.hero, sourcebooks).map(s => s.name) : [];

		const visibleSkills = allSkills;
		if (visibleSkills.length === 0) { return null; }

		return (
			<div id={sectionSlug(RulesPage.Skills)} className='rules-entry'>
				<h2 className='rules-section-heading'>Skills</h2>
				{
					[
						SkillList.Crafting,
						SkillList.Exploration,
						SkillList.Interpersonal,
						SkillList.Intrigue,
						SkillList.Lore
					].map(sl => {
						const inGroup = visibleSkills.filter(s => s.list === sl);
						if (inGroup.length === 0) { return null; }
						return (
							<div key={sl} className='rules-entry depth-1'>
								<h3 className='rules-entry-heading'>{sl}</h3>
								<Space orientation='vertical' style={{ paddingBottom: '20px', width: '100%' }}>
									{
										inGroup.map(s => (
											<div key={s.name} id={skillSlug(s.name)}>
												<Field
													highlight={skillNames.includes(s.name)}
													label={s.name}
													value={s.description}
												/>
											</div>
										))
									}
								</Space>
							</div>
						);
					})
				}
			</div>
		);
	};

	const getLanguagesSection = () => {
		const sourcebooks = props.hero ? props.hero.sourcebookIDs.map(id => props.sourcebooks.find(s => s.id === id)).filter(s => !!s) : props.sourcebooks;
		const allLanguages = SourcebookLogic.getLanguages(sourcebooks);
		const languageNames = props.hero ? HeroLogic.getLanguages(props.hero, sourcebooks).map(l => l.name) : [];

		const visibleLangs = allLanguages;
		if (visibleLangs.length === 0) { return null; }

		return (
			<div id={sectionSlug(RulesPage.Languages)} className='rules-entry'>
				<h2 className='rules-section-heading'>Languages</h2>
				{
					[
						LanguageType.Common,
						LanguageType.Regional,
						LanguageType.Cultural,
						LanguageType.Dead
					].map(type => {
						const inGroup = visibleLangs.filter(l => l.type === type);
						if (inGroup.length === 0) { return null; }
						return (
							<div key={type} className='rules-entry depth-1'>
								<h3 className='rules-entry-heading'>{type} Languages</h3>
								<Space orientation='vertical' style={{ paddingBottom: '20px', width: '100%' }}>
									{
										inGroup.map(l => (
											<div key={l.name} id={languageSlug(l.name)}>
												<Field
													highlight={languageNames.includes(l.name)}
													label={l.name}
													value={l.description}
												/>
												{
													l.related.length > 0 ?
														<div style={{ padding: '0 0 5px 10px' }}>
															Related to: {l.related.join(', ')}
														</div>
														: null
												}
											</div>
										))
									}
								</Space>
							</div>
						);
					})
				}
			</div>
		);
	};

	const getAbilitiesSection = () => {
		const groups: { label: string; items: typeof AbilityData.charge[] }[] = [
			{ label: 'Main Actions', items: [ AbilityData.charge, AbilityData.defend, AbilityData.freeStrike, AbilityData.heal, AbilityData.swap ].filter(a => a.type.usage === AbilityUsage.MainAction) },
			{ label: 'Maneuvers', items: [ AbilityData.aidAttack, AbilityData.catchBreath, AbilityData.clawDirt, AbilityData.escapeGrab, AbilityData.goProne, AbilityData.grab, AbilityData.hide, AbilityData.knockback, AbilityData.makeAssistTest, AbilityData.search, AbilityData.standUp, AbilityData.useConsumable ].filter(a => a.type.usage === AbilityUsage.Maneuver) },
			{ label: 'Move Actions', items: [ AbilityData.advance, AbilityData.disengage, AbilityData.ride ].filter(a => a.type.usage === AbilityUsage.Move) },
			{ label: 'Triggers', items: [ AbilityData.opportunityAttack ].filter(a => a.type.usage === AbilityUsage.Trigger) },
			{ label: 'Free Strikes', items: [ AbilityData.freeStrikeMelee, AbilityData.freeStrikeRanged ] }
		];

		const filtered = groups;
		if (filtered.length === 0) { return null; }

		return (
			<div id={sectionSlug(RulesPage.Abilities)} className='rules-entry'>
				<h2 className='rules-section-heading'>Standard Abilities</h2>
				{
					filtered.map(g => (
						<div key={g.label} className='rules-entry depth-1'>
							<h3 className='rules-entry-heading'>{g.label}</h3>
							<Space orientation='vertical' style={{ paddingBottom: '20px', width: '100%' }}>
								{
									g.items.map(a => (
										<SelectablePanel key={a.id}>
											<AbilityPanel ability={a} hero={props.hero || undefined} mode={PanelMode.Full} />
										</SelectablePanel>
									))
								}
							</Space>
						</div>
					))
				}
			</div>
		);
	};

	return (
		<Modal
			content={
				<div className='reference-modal'>
					<div ref={rulesScrollRef} className='rules-doc' style={{ flex: '1 1 0', overflowY: 'auto', paddingRight: 10 }} onClick={handleDocClick}>
						{getRulesSection()}
						{getConditionsSection()}
						{getSkillsSection()}
						{getLanguagesSection()}
						{getAbilitiesSection()}
					</div>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
