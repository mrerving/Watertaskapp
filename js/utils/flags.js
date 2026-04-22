/**
 * Determine if a Tide should display the flag indicator.
 *
 * Flag conditions:
 * 1. More than half the Tide's Waves are `beached` but the Tide itself is NOT `beached`.
 * 2. More than half the Tide's Waves are `still` or `evaporated` but the Tide is NOT `still` or `evaporated`.
 *
 * @param {Object} tide
 * @returns {boolean}
 */
export function shouldFlag(tide) {
  const waves = tide.waves || [];
  if (waves.length === 0) return false;

  const total = waves.length;
  const half  = total / 2;

  const beachedCount    = waves.filter(w => w.status === 'beached').length;
  const archivedCount   = waves.filter(w => w.status === 'still' || w.status === 'evaporated').length;

  if (beachedCount > half && tide.status !== 'beached') return true;
  if (archivedCount > half && tide.status !== 'still' && tide.status !== 'evaporated') return true;

  return false;
}
