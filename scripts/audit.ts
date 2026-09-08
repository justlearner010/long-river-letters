import { enrichedEvents } from '../src/lib/enrichEvents';
import { polities } from '../src/data/polities';
import { polityRules } from '../src/data/polityRules';
import { loadCountries } from '../src/lib/world';

const countryNames = new Set(loadCountries().map((country) => country.name));
const ruledPolities = new Set(polityRules.map((rule) => rule.polityId));
const polityById = new Map(polities.map((polity) => [polity.id, polity]));

const noRule: string[] = [];
const noPolity: string[] = [];
const missingNames = new Set<string>();

for (const event of enrichedEvents) {
  for (const polityId of event.polityIds) {
    if (!polityById.has(polityId)) noPolity.push(`${event.id}: ${polityId}`);
    if (!ruledPolities.has(polityId)) noRule.push(`${event.id}: ${polityId}`);
  }
  for (const link of [...(event.links ?? []), ...(event.flows ?? [])]) {
    if (!countryNames.has(link.from)) missingNames.add(`${event.id}.from=${link.from}`);
    if (!countryNames.has(link.to)) missingNames.add(`${event.id}.to=${link.to}`);
  }
}

console.log('== events referencing missing polities ==');
console.log(noPolity.join('\n') || 'none');
console.log('\n== event polities that cannot be highlighted (no rule) ==');
console.log(noRule.join('\n') || 'none');
console.log('\n== link/flow country names not in basemap ==');
console.log([...missingNames].join('\n') || 'none');
