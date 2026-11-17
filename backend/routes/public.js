const express = require('express');
const { FIELDS, COUNTRIES } = require('../lib/catalog');
const cfg = require('../lib/config');

const router = express.Router();
// Lists the sign-up form needs before anyone has an account.
router.get('/meta', (req, res) => res.json({ success: true, fields: FIELDS, countries: COUNTRIES, support_email: cfg.SUPPORT_EMAIL }));
module.exports = router;
