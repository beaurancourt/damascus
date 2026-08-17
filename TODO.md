- summoner: the once-per-round essence gain is data now, but nothing stops you
  taking it twice - upstream tracks a `used` flag per gain and greys the button
  out until the round ends. That needs hero state and a reset hook, so it is
  its own piece of work.
