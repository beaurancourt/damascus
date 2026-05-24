export interface RulesItem {
	label: string;
	content: string;
	// Optional hierarchy mirroring the Draw Steel rulebook table of contents.
	// `parent` is the label of another RulesItem this one nests under
	// (e.g. "Slamming into Creatures" is under "Forced Movement", which is under "Movement").
	parent?: string;
	// Top-level rulebook section ("Combat", "Tests", "The Basics", ...).
	// Used by the reference modal to group rules by chapter.
	section?: string;
	// Full ancestor chain from PDF, excluding section and the rule itself.
	// Used to surface intermediate sub-headings the PDF has but our data doesn't
	// (e.g. "Abilities" between Classes section and the Ability Distance rule).
	ancestors?: string[];
	// 1-based PDF page where this rule starts. Drives ordering in the reference modal.
	page?: number;
}
