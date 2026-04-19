/**
 * FSV Capital — Smart Filter Rules v2
 * ─────────────────────────────────────────────────────────────
 * UPGRADED:
 * - Clearer separation of hard vs. soft rejection
 * - More descriptive rejection reasons
 * - Funding range validation (min/max)
 * - Sector alignment check with weighted logic
 * - Traction gate for late-stage applications
 * ─────────────────────────────────────────────────────────────
 */

// Sectors FSV Capital actively invests in
const CORE_SECTORS    = ['AI', 'Fintech', 'Blockchain', 'DeepTech'];
const ALLOWED_SECTORS = ['AI', 'Fintech', 'Blockchain', 'DeepTech', 'SaaS', 'HealthTech'];
const MIN_FUNDING_USD  = 10_000;
const MAX_FUNDING_USD  = 100_000_000; // $100M ceiling
const MIN_PROBLEM_LEN  = 30;
const MIN_SOLUTION_LEN = 30;
const MIN_FOUNDER_LEN  = 40;

/**
 * @typedef {Object} FilterResult
 * @property {boolean} pass         - True only if zero violations of any kind
 * @property {boolean} hardRejected - True if application must be rejected outright
 * @property {string[]} hardReasons - Reasons for hard rejection
 * @property {string[]} softWarnings- Advisory warnings (saved but flagged)
 * @property {FlagSet}  flags       - Individual flag booleans for DB storage
 */

/**
 * Run all filter rules against an application
 * @param {Object} data  - Normalized application data
 * @param {Object} files - Uploaded files map { pitchDeck, financialModel, productDemo }
 * @returns {FilterResult}
 */
function applyFilterRules(data, files = {}) {
  const hardReasons   = [];
  const softWarnings  = [];

  const flags = {
    pitchDeckMissing:       false,
    sectorMismatch:         false,
    tractionInsufficient:   false,
    fundingOutOfRange:      false,
    contentTooThin:         false,
    missingRequiredConsent: false,
    autoRejected:           false,
    rejectionReason:        null
  };

  // ── HARD RULE 1: Pitch deck mandatory ────────────────────────
  const hasDeck = files?.pitchDeck || data.documents?.pitchDeckPath;
  if (!hasDeck) {
    flags.pitchDeckMissing = true;
    hardReasons.push(
      'Pitch deck not uploaded. All applications require a PDF pitch deck ' +
      'before they can be reviewed by the investment team.'
    );
  }

  // ── HARD RULE 2: Sector alignment ────────────────────────────
  const sectors = (data.overview?.sectors) || (data.sectors) || [];
  if (sectors.length > 0) {
    const hasAllowed = sectors.some(s => ALLOWED_SECTORS.includes(s));
    if (!hasAllowed) {
      flags.sectorMismatch = true;
      hardReasons.push(
        `Sector mismatch. FSV Capital invests only in: ${ALLOWED_SECTORS.join(', ')}. ` +
        `You submitted: ${sectors.join(', ')}.`
      );
    } else if (!sectors.some(s => CORE_SECTORS.includes(s))) {
      // In allowed but not in core — soft warning only
      softWarnings.push(
        `Your sector (${sectors.join(', ')}) is in our extended focus area. ` +
        `Core thesis sectors (${CORE_SECTORS.join(', ')}) receive faster review.`
      );
    }
  } else {
    hardReasons.push('No sector selected. At least one industry must be specified.');
  }

  // ── HARD RULE 3: Funding range ───────────────────────────────
  const amount = parseFloat(data.funding?.amountUSD || data.amount || 0);
  if (isNaN(amount) || amount < MIN_FUNDING_USD) {
    flags.fundingOutOfRange = true;
    hardReasons.push(
      `Funding ask too low. Minimum via this portal is $${MIN_FUNDING_USD.toLocaleString()}. ` +
      `Submitted: $${amount.toLocaleString()}.`
    );
  } else if (amount > MAX_FUNDING_USD) {
    flags.fundingOutOfRange = true;
    hardReasons.push(
      `Funding ask too high. Maximum via this portal is $${MAX_FUNDING_USD.toLocaleString()}. ` +
      `For larger rounds, contact FSV Capital directly.`
    );
  }

  // ── HARD RULE 4: Required consent ────────────────────────────
  const consent = data.compliance?.consentItems || data.consent || [];
  const requiredConsents = [
    'I consent to sharing my information with FSV Capital partner investors',
    'I confirm all data submitted is accurate',
    'I agree to the Privacy Policy (DPDP compliant)'
  ];
  const missingConsents = requiredConsents.filter(c => !consent.includes(c));
  if (missingConsents.length > 0) {
    flags.missingRequiredConsent = true;
    hardReasons.push(
      `Required declarations not acknowledged: ${missingConsents.length} of ${requiredConsents.length} missing.`
    );
  }

  // ── SOFT RULE 1: Traction gate for late-stage ────────────────
  const stage = data.overview?.currentStage || data.stage;
  const mrr   = parseFloat(data.traction?.monthlyRevenue || data.revenue_monthly || 0);
  const cust  = parseInt(data.traction?.customers || data.customers || 0);

  if (['Growth Stage', 'Scaling'].includes(stage) && mrr === 0 && cust === 0) {
    flags.tractionInsufficient = true;
    softWarnings.push(
      `${stage} startup with zero reported revenue and zero customers. ` +
      `This will significantly lower your deal score and may delay review. ` +
      `Please ensure your traction data is accurate.`
    );
  }

  // ── SOFT RULE 2: Content quality check ───────────────────────
  const problem  = data.overview?.problemStatement || data.problem || '';
  const solution = data.overview?.solutionOverview || data.solution || '';
  const founder  = data.team?.founderBackground || data.founder_bg || '';

  if (problem.trim().length < MIN_PROBLEM_LEN) {
    flags.contentTooThin = true;
    softWarnings.push('Problem statement is very brief — investors expect specific, quantified problem descriptions.');
  }
  if (solution.trim().length < MIN_SOLUTION_LEN) {
    flags.contentTooThin = true;
    softWarnings.push('Solution overview is very brief — this will reduce your review priority.');
  }
  if (founder.trim().length < MIN_FOUNDER_LEN) {
    softWarnings.push('Founder background is minimal — team section is one of the most important for investors.');
  }

  // ── Final determination ───────────────────────────────────────
  if (hardReasons.length > 0) {
    flags.autoRejected    = true;
    flags.rejectionReason = hardReasons.join(' | ');
  }

  return {
    pass:          hardReasons.length === 0 && softWarnings.length === 0,
    hardRejected:  flags.autoRejected,
    hardReasons,
    softWarnings,
    flags
  };
}

module.exports = { applyFilterRules, ALLOWED_SECTORS, CORE_SECTORS };
