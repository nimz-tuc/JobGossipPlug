/**
 * Decides whether an opportunity suits a visitor.
 *   level:   only 'entry' opportunities are offered to someone who is just starting out ('student').
 *   country: mode 'allow' = only these countries, 'block' = everyone except these, 'all' = no rule.
 * Fields never exclude anyone, they only decide the order (opportunities in the visitor's fields come first).
 */
function evaluate(opp, user) {
  if (opp.min_level === 'skilled' && user.level === 'student') return { ok: false, reason: 'skills' };
  const list = opp.countries || [];
  if (opp.country_mode === 'allow' && !list.includes(user.country)) return { ok: false, reason: 'country' };
  if (opp.country_mode === 'block' && list.includes(user.country)) return { ok: false, reason: 'country' };
  return { ok: true };
}

function matchesFields(opp, user) {
  const mine = user.fields || [];
  const theirs = opp.fields || [];
  return !mine.length || !theirs.length || theirs.some(f => mine.includes(f));
}

/** Splits active opportunities into those suitable for a visitor, best matches first. */
function sortForUser(opps, user) {
  const eligible = [], unavailable = [];
  for (const o of opps) {
    const v = evaluate(o, user);
    if (v.ok) eligible.push({ ...o, field_match: matchesFields(o, user) });
  }
  const rank = (a, b) => (b.field_match - a.field_match) || (a.sort_order - b.sort_order) || (a.id - b.id);
  eligible.sort(rank);
  return { eligible, unavailable };
}

module.exports = { evaluate, matchesFields, sortForUser };
