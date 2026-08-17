// How often a heroic resource gain can be taken. Most gains are unlimited, so
// the field is optional throughout and absent means At Will.
export enum ResourceGainFrequency {
	AtWill = 'At Will',
	OncePerRound = 'Per Round',
	OncePerEncounter = 'Per Encounter'
}
