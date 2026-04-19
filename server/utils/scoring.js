/**
 * FSV Capital — Deal Scoring Engine v2
 * ─────────────────────────────────────────────────────────────
 * UPGRADED: More balanced weights, granular sub-scoring,
 * bonus point system, and detailed breakdown output.
 *
 * Dimension weights (total = 100):
 *   Market Opportunity  → 20 pts
 *   Traction & Revenue  → 25 pts
 *   Team Strength       → 20 pts
 *   Innovation Level    → 20 pts
 *   Revenue Stage       → 15 pts
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Main entry point
 * @param {Object} data - Normalized startup application object
 * @returns {ScoringResult}
 */
function calculateDealScore(data) {
  const market    = scoreMarket(data);
  const traction  = scoreTraction(data);
  const team      = scoreTeam(data);
  const innovation= scoreInnovation(data);
  const stage     = scoreStage(data);

  // Bonus points (up to 5) for cross-dimension excellence
  const bonus     = calcBonus(data, { market, traction, team, innovation, stage });

  const raw = market.score + traction.score + team.score + innovation.score + stage.score + bonus;
  const total = Math.min(Math.round(raw), 100);

  return {
    total,
    grade: getGrade(total),
    dims: {
      market:    { score: market.score,    max: 20, detail: market.detail },
      traction:  { score: traction.score,  max: 25, detail: traction.detail },
      team:      { score: team.score,      max: 20, detail: team.detail },
      innovation:{ score: innovation.score,max: 20, detail: innovation.detail },
      stage:     { score: stage.score,     max: 15, detail: stage.detail },
    },
    bonus,
    flags: buildFlags(data, { market, traction, stage })
  };
}

// ─── Market Opportunity (20 pts) ─────────────────────────────
function scoreMarket(data) {
  let score = 0;
  const detail = [];
  const m = data.market || {};

  // TAM signal (0–8): infer scale from text
  const tam = (m.tam || data.tam || '').toLowerCase();
  if (tam) {
    const tamPts = tam.includes('trillion') ? 8
      : (tam.includes('billion') || /\d+b/.test(tam)) ? 7
      : (tam.includes('hundred million') || /\d00m/.test(tam)) ? 5
      : (tam.includes('million') || /\d+m/.test(tam)) ? 3 : 1;
    score += tamPts;
    detail.push({ item: 'TAM size signal', pts: tamPts, max: 8 });
  } else {
    detail.push({ item: 'TAM size signal', pts: 0, max: 8, missing: true });
  }

  // SAM / SOM provided (0–3)
  if (m.sam || data.sam) { score += 2; detail.push({ item: 'SAM defined', pts: 2, max: 2 }); }
  if (m.som || data.som) { score += 1; detail.push({ item: 'SOM defined', pts: 1, max: 1 }); }

  // Competitor analysis quality (0–5)
  const competitors = m.keyCompetitors || data.competitors || '';
  const compPts = competitors.length > 200 ? 5
    : competitors.length > 100 ? 4
    : competitors.length > 40  ? 2 : 0;
  score += compPts;
  detail.push({ item: 'Competitor analysis', pts: compPts, max: 5 });

  // Competitive advantage quality (0–4)
  const adv = m.competitiveAdv || data.advantage || '';
  const advPts = adv.length > 150 ? 4 : adv.length > 70 ? 2 : 0;
  score += advPts;
  detail.push({ item: 'Competitive advantage', pts: advPts, max: 4 });

  return { score: Math.min(score, 20), detail };
}

// ─── Traction & Revenue (25 pts) ─────────────────────────────
function scoreTraction(data) {
  let score = 0;
  const detail = [];
  const t = data.traction || {};

  // Monthly Recurring Revenue (0–10)
  const mrr = parseFloat(t.monthlyRevenue || data.revenue_monthly || 0);
  const mrrPts = mrr >= 500_000 ? 10
    : mrr >= 100_000 ? 9
    : mrr >= 50_000  ? 7
    : mrr >= 10_000  ? 5
    : mrr >= 1_000   ? 3
    : mrr > 0        ? 1 : 0;
  score += mrrPts;
  detail.push({ item: `MRR ($${mrr.toLocaleString()})`, pts: mrrPts, max: 10 });

  // Month-over-Month Growth Rate (0–8)
  const growth = parseFloat(t.growthRatePct || data.growth_rate || 0);
  const growthPts = growth >= 100 ? 8
    : growth >= 50 ? 7
    : growth >= 30 ? 6
    : growth >= 15 ? 4
    : growth >= 5  ? 2
    : growth > 0   ? 1 : 0;
  score += growthPts;
  detail.push({ item: `MoM Growth (${growth}%)`, pts: growthPts, max: 8 });

  // Customer / User Count (0–7)
  const customers = parseInt(t.customers || data.customers || 0);
  const custPts = customers >= 100_000 ? 7
    : customers >= 10_000  ? 6
    : customers >= 1_000   ? 5
    : customers >= 100     ? 3
    : customers >= 10      ? 2
    : customers > 0        ? 1 : 0;
  score += custPts;
  detail.push({ item: `Customers (${customers.toLocaleString()})`, pts: custPts, max: 7 });

  return { score: Math.min(score, 25), detail };
}

// ─── Team Strength (20 pts) ──────────────────────────────────
function scoreTeam(data) {
  let score = 0;
  const detail = [];
  const team = data.team || {};

  // Founder background depth (0–9)
  const founderBg = team.founderBackground || data.founder_bg || '';
  // Signals: domain expertise, prior exits, notable employers
  const hasExit = /exit|acqui|ipo|sold/i.test(founderBg);
  const hasNotable = /google|meta|amazon|stripe|sequoia|y combinator|goldman|mckinsey|stanford|iit|iim/i.test(founderBg);
  let fPts = founderBg.length > 500 ? 6 : founderBg.length > 250 ? 4 : founderBg.length > 80 ? 2 : 0;
  if (hasExit) fPts = Math.min(fPts + 2, 9);
  if (hasNotable) fPts = Math.min(fPts + 1, 9);
  score += fPts;
  detail.push({ item: 'Founder background', pts: fPts, max: 9, bonuses: [hasExit && 'Prior exit', hasNotable && 'Notable employer'].filter(Boolean) });

  // Core team completeness (0–7)
  const coreTeam = team.coreTeamMembers || data.core_team || '';
  const teamPts = coreTeam.length > 300 ? 7 : coreTeam.length > 150 ? 5 : coreTeam.length > 50 ? 3 : coreTeam.length > 0 ? 1 : 0;
  score += teamPts;
  detail.push({ item: 'Core team completeness', pts: teamPts, max: 7 });

  // Advisors (0–4)
  const advisors = team.advisors || data.advisors || '';
  const advPts = advisors.length > 150 ? 4 : advisors.length > 60 ? 2 : advisors.length > 0 ? 1 : 0;
  score += advPts;
  detail.push({ item: 'Advisors & mentors', pts: advPts, max: 4 });

  return { score: Math.min(score, 20), detail };
}

// ─── Innovation Level (20 pts) ───────────────────────────────
function scoreInnovation(data) {
  let score = 0;
  const detail = [];
  const product = data.product || {};

  // USP quality & depth (0–8)
  const usp = product.uniqueValueProposition || data.usp || '';
  const uspPts = usp.length > 300 ? 8 : usp.length > 180 ? 6 : usp.length > 80 ? 3 : usp.length > 0 ? 1 : 0;
  score += uspPts;
  detail.push({ item: 'USP depth & clarity', pts: uspPts, max: 8 });

  // Tech stack sophistication (0–7)
  const techStack = product.techStack || data.tech_stack || [];
  const deepTech = ['AI/ML', 'Blockchain', 'Web3', 'IoT', 'Robotics'];
  const deepCount = (Array.isArray(techStack) ? techStack : []).filter(t => deepTech.includes(t)).length;
  const techPts = deepCount >= 3 ? 7 : deepCount >= 2 ? 6 : deepCount === 1 ? 4 : techStack.length > 0 ? 2 : 0;
  score += techPts;
  detail.push({ item: `Tech sophistication (${deepCount} deep-tech)`, pts: techPts, max: 7 });

  // IP & Patents (0–5)
  const ip = product.ipPatents || data.ip_patents || '';
  const hasGranted = /granted|approved|awarded/i.test(ip);
  let ipPts = ip.length > 80 ? 3 : ip.length > 20 ? 2 : ip.length > 0 ? 1 : 0;
  if (hasGranted) ipPts = Math.min(ipPts + 2, 5);
  score += ipPts;
  detail.push({ item: 'IP / Patents', pts: ipPts, max: 5, bonus: hasGranted ? 'Granted patent' : null });

  return { score: Math.min(score, 20), detail };
}

// ─── Revenue Stage (15 pts) ──────────────────────────────────
function scoreStage(data) {
  const stageMap = {
    'Idea':         { score: 3,  label: 'Very early — high risk' },
    'MVP':          { score: 6,  label: 'Product exists, no revenue' },
    'Early Revenue':{ score: 10, label: 'Validated demand' },
    'Growth Stage': { score: 13, label: 'Strong signal, scaling needed' },
    'Scaling':      { score: 15, label: 'Full marks — proven model' }
  };
  const stage = (data.overview?.currentStage) || data.stage || 'Idea';
  const result = stageMap[stage] || { score: 0, label: 'Unknown stage' };
  return { score: result.score, detail: [{ item: stage, pts: result.score, max: 15, note: result.label }] };
}

// ─── Bonus Points (0–5) ──────────────────────────────────────
function calcBonus(data, dims) {
  let bonus = 0;
  // All 5 dims score > 50% of their max → execution bonus
  const allGood = [
    dims.market.score >= 10,
    dims.traction.score >= 12,
    dims.team.score >= 10,
    dims.innovation.score >= 10,
    dims.stage.score >= 7
  ].every(Boolean);
  if (allGood) bonus += 3;

  // Strong traction + strong team → synergy bonus
  if (dims.traction.score >= 18 && dims.team.score >= 15) bonus += 2;

  return Math.min(bonus, 5);
}

// ─── Grade Mapping ────────────────────────────────────────────
function getGrade(total) {
  if (total >= 85) return { label: 'Exceptional',     tier: 'A+', color: '#22c55e', action: 'Fast-track to IC' };
  if (total >= 75) return { label: 'Strong Deal',     tier: 'A',  color: '#84cc16', action: 'Priority review' };
  if (total >= 65) return { label: 'Good Potential',  tier: 'B+', color: '#d4a843', action: 'Standard review' };
  if (total >= 50) return { label: 'Promising',       tier: 'B',  color: '#f59e0b', action: 'Watch list' };
  if (total >= 35) return { label: 'Early Stage',     tier: 'C',  color: '#fb923c', action: 'Revisit in 6 months' };
  return            { label: 'Needs Development', tier: 'D',  color: '#ef4444', action: 'Not investable yet' };
}

// ─── Score Flags (advisory, not hard-rejection) ───────────────
function buildFlags(data, dims) {
  const flags = [];
  if (dims.traction.score < 5 && ['Growth Stage', 'Scaling'].includes(data.stage || data.overview?.currentStage))
    flags.push({ type: 'warn', msg: 'Growth/Scaling stage with very low traction score — unusual' });
  if (dims.market.score < 8)
    flags.push({ type: 'info', msg: 'Market section is thin — consider expanding TAM/SAM analysis' });
  if (dims.team.score < 6)
    flags.push({ type: 'warn', msg: 'Team section is sparse — investors prioritize team detail' });
  return flags;
}

module.exports = { calculateDealScore };
