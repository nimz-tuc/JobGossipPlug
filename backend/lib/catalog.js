// The fixed lists the app uses everywhere (sign-up form, profile, admin form, and server-side validation).
const FIELDS = [
  { key: 'tech', label: 'Software & IT' },
  { key: 'data', label: 'Data & AI' },
  { key: 'engineering', label: 'Engineering & CAD' },
  { key: 'science', label: 'Science & maths' },
  { key: 'medicine', label: 'Medicine & health' },
  { key: 'finance', label: 'Finance & accounting' },
  { key: 'business', label: 'Business, sales & operations' },
  { key: 'law', label: 'Law' },
  { key: 'creative', label: 'Design, video & music' },
  { key: 'writing', label: 'Languages & writing' },
  { key: 'general', label: 'General tasks (no special skills)' },
];
const LEVELS = ['student', 'skilled']; // student = starting out / no professional skills yet

const COUNTRIES = ('AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ '
  + 'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
  + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ '
  + 'OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ '
  + 'UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' ');

const FIELD_KEYS = FIELDS.map(f => f.key);
const COUNTRY_SET = new Set(COUNTRIES);

module.exports = { FIELDS, FIELD_KEYS, LEVELS, COUNTRIES, COUNTRY_SET };
