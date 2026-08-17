- summoner: the once-per-round essence gain is data now, but nothing stops you
  taking it twice - upstream tracks a `used` flag per gain and greys the button
  out until the round ends. That needs hero state and a reset hook, so it is
  its own piece of work.
- summoner: the level-5 upgrade ("gain 2 essence instead of 1") is still prose
  in a Text feature; upstream expresses it as a second gain that replaces the
  first via replacesTags, which our engine already supports
