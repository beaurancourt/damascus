- finish the summoner sync: the last piece is heroic-resource frequency
  (ResourceGainFrequency, with a per-round `used` flag on the gain). It would
  let the summoner's essence gain say "once per round" as data rather than as
  prose in the trigger, and it touches hero state, so it needs its own pass.
  Summon formations and the summoner data are both in sync as of this commit.
