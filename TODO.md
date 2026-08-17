- de-nest preparation for items. /tmp/damascus-ss/item-denest.jpg
- drop the filter dropdown for items. we can lean on just searching for names
- in the inventory screen, add a `+` button to the right of the search bar that
  lets people add custom items. my players just picked up 5oz of costmary
  leaves and that item doesn't exist in the list
- in the inventory screen, make items uncollapsed by default
- drop the "customize" option from the wrench dropdown
- pick a better icon for the wrench, it's a list of additional features like inventory and titles, but wrench implies adjustment
- "Generate a Random Hero" often makes a hero whose sheet throws: 5 of 8 tries hit an uncaught TypeError on the hero view (mostly `Cannot read properties of undefined (reading 'id')`, once `reading 'toLowerCase'` with no sheet rendered at all). Reproduce against a production build - dev is clean. Pregens are fine (8/8); heroes built by hand and older saved heroes untested, so this may be a data-shape problem rather than a random-generation one
