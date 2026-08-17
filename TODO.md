- finish the summoner sync: upstream now expresses summon formations and
  heroic-resource frequency through engine features we don't have
  (createSummonFormation, ResourceGainFrequency with per-round `used` state).
  Porting those is ~128 lines across models/enums/factory plus consumers in
  feature.tsx, features-panel.tsx and feature-logic.ts, and touches hero state.
  The summoner *data* is already in sync as of this commit.
