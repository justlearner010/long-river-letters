import { chapters } from '../src/data/chapters';
import { slices } from '../src/data/slices';
import { events } from '../src/data/events';
import { validateWorldData } from '../src/lib/validate';

const errors = validateWorldData(chapters, slices, events);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${chapters.length} chapters, ${slices.length} slices, ${events.length} events`);
