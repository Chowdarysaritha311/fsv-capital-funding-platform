/**
 * FSV Capital — useFormStore
 * ─────────────────────────────────────────────────────────────
 * Centralized form state hook with:
 *  - Auto-save to localStorage (debounced)
 *  - Draft resume from localStorage
 *  - Per-step validation
 *  - Step navigation with validation gate
 *  - File management
 *  - Deal score computation
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'fsv_v2_draft';
const AUTOSAVE_DELAY_MS = 1200;

// ─── Scoring (mirrors backend scoring.js) ────────────────────
export function computeScore(data) {
  let market = 0, traction = 0, team = 0, innovation = 0, stage = 0;

  // Market (max 20)
  const tam = (data.tam || '').toLowerCase();
  if (tam) {
    market += (tam.includes('trillion') ? 8 : tam.includes('billion') ? 7 : tam.includes('million') ? 3 : 1);
  }
  if (data.sam) market += 2;
  if (data.competitors?.length > 100) market += 4; else if (data.competitors?.length > 40) market += 2;
  if (data.advantage?.length > 150) market += 4; else if (data.advantage?.length > 70) market += 2;
  market = Math.min(market, 20);

  // Traction (max 25)
  const mrr = parseFloat(data.revenue_monthly || 0);
  traction += mrr >= 500_000 ? 10 : mrr >= 100_000 ? 9 : mrr >= 50_000 ? 7 : mrr >= 10_000 ? 5 : mrr > 0 ? 2 : 0;
  const gr = parseFloat(data.growth_rate || 0);
  traction += gr >= 100 ? 8 : gr >= 50 ? 7 : gr >= 30 ? 6 : gr >= 15 ? 4 : gr > 0 ? 1 : 0;
  const cust = parseInt(data.customers || 0);
  traction += cust >= 100_000 ? 7 : cust >= 10_000 ? 6 : cust >= 1_000 ? 5 : cust >= 100 ? 3 : cust > 0 ? 1 : 0;
  traction = Math.min(traction, 25);

  // Team (max 20)
  const fb = data.founder_bg || '';
  team += fb.length > 400 ? 9 : fb.length > 200 ? 7 : fb.length > 80 ? 4 : fb.length > 0 ? 2 : 0;
  team += (data.core_team?.length > 200) ? 7 : (data.core_team?.length > 50) ? 4 : data.core_team ? 2 : 0;
  team += data.advisors?.length > 100 ? 4 : data.advisors ? 2 : 0;
  team = Math.min(team, 20);

  // Innovation (max 20)
  innovation += (data.usp?.length > 300) ? 8 : (data.usp?.length > 150) ? 6 : data.usp ? 2 : 0;
  const deepTech = ['AI/ML','Blockchain','Web3','IoT','Robotics'];
  const deepCount = (data.tech_stack || []).filter(t => deepTech.includes(t)).length;
  innovation += deepCount >= 3 ? 7 : deepCount >= 2 ? 6 : deepCount === 1 ? 4 : (data.tech_stack?.length > 0) ? 2 : 0;
  innovation += (data.ip_patents?.length > 80) ? 5 : data.ip_patents ? 2 : 0;
  innovation = Math.min(innovation, 20);

  // Stage (max 15)
  const stageMap = { Idea: 3, MVP: 6, 'Early Revenue': 10, 'Growth Stage': 13, Scaling: 15 };
  stage = stageMap[data.stage] || 0;

  const total = Math.min(market + traction + team + innovation + stage, 100);
  const dims = [
    { label: 'Market',    score: market,    max: 20 },
    { label: 'Traction',  score: traction,  max: 25 },
    { label: 'Team',      score: team,      max: 20 },
    { label: 'Innovation',score: innovation,max: 20 },
    { label: 'Stage',     score: stage,     max: 15 }
  ];
  return { total, dims, market, traction, team, innovation, stage };
}

// ─── Per-step validators ─────────────────────────────────────
const VALIDATORS = {
  basic(data) {
    const e = {};
    if (!data.startup_name?.trim()) e.startup_name = 'Startup name is required';
    if (!data.founder_name?.trim()) e.founder_name = 'Founder name(s) are required';
    if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email (e.g. founder@company.com)';
    if (data.website && !/^https?:\/\/.+\..+/.test(data.website)) e.website = 'Enter a full URL including https://';
    if (!data.hq_city?.trim())    e.hq_city    = 'City is required';
    if (!data.hq_country?.trim()) e.hq_country = 'Country is required';
    return e;
  },
  overview(data) {
    const e = {};
    const ALLOWED = ['AI','Fintech','Blockchain','DeepTech','SaaS','HealthTech'];
    if (!data.problem?.trim() || data.problem.trim().length < 30)
      e.problem = 'Problem statement must be at least 30 characters — be specific';
    if (!data.solution?.trim() || data.solution.trim().length < 30)
      e.solution = 'Solution overview must be at least 30 characters';
    if (!data.sectors?.length) e.sectors = 'Select at least one sector';
    else if (!data.sectors.some(s => ALLOWED.includes(s)))
      e.sectors = 'FSV Capital invests in: AI, Fintech, Blockchain, DeepTech, SaaS, HealthTech';
    if (!data.stage) e.stage = 'Select your current stage';
    return e;
  },
  product(data) {
    const e = {};
    if (!data.core_product?.trim() || data.core_product.trim().length < 20)
      e.core_product = 'Core product description required (min 20 characters)';
    if (!data.usp?.trim() || data.usp.trim().length < 30)
      e.usp = 'USP must be at least 30 characters — make it compelling';
    return e;
  },
  market(data) {
    const e = {};
    if (!data.tam?.trim()) e.tam = 'Total Addressable Market is required';
    if (!data.customer_segment?.trim()) e.customer_segment = 'Describe your primary customer segment';
    if (!data.competitors?.trim()) e.competitors = 'List your key competitors';
    if (!data.advantage?.trim() || data.advantage.trim().length < 20)
      e.advantage = 'Explain your competitive advantage (min 20 chars)';
    return e;
  },
  traction(data) {
    const e = {};
    const isLateStage = ['Growth Stage', 'Scaling'].includes(data.stage);
    if (isLateStage && !data.revenue_monthly && !data.customers) {
      e.revenue_monthly = `${data.stage} requires traction data — enter revenue or customer count`;
    }
    return e;
  },
  financials: () => ({}),
  funding(data) {
    const e = {};
    const amt = parseFloat(data.amount || 0);
    if (!data.amount || isNaN(amt) || amt < 10_000) e.amount = 'Minimum funding ask is $10,000';
    if (amt > 100_000_000) e.amount = 'Maximum via this portal is $100M — contact FSV directly for larger rounds';
    if (!data.funding_stage) e.funding_stage = 'Select your funding stage';
    if (data.equity && (parseFloat(data.equity) < 0 || parseFloat(data.equity) > 100))
      e.equity = 'Equity must be between 0% and 100%';
    return e;
  },
  team(data) {
    const e = {};
    if (!data.founder_bg?.trim() || data.founder_bg.trim().length < 40)
      e.founder_bg = 'Founder background required (min 40 chars) — this is one of the most important sections';
    if (!data.core_team?.trim()) e.core_team = 'List your core team members with name, role, and background';
    return e;
  },
  strategic(data) {
    const e = {};
    if (!data.why_fsv?.trim() || data.why_fsv.trim().length < 30)
      e.why_fsv = 'Explain why FSV Capital specifically — generic answers reduce your score (min 30 chars)';
    return e;
  },
  documents(data, files) {
    const e = {};
    if (!files?.pitchDeck) e.pitchDeck = 'Pitch deck (PDF) is mandatory — applications without a deck are auto-rejected';
    return e;
  },
  compliance(data) {
    const e = {};
    if (!data.registered) e.registered = 'Indicate your registration status';
    const required = [
      'I consent to sharing my information with FSV Capital partner investors',
      'I confirm all data submitted is accurate',
      'I agree to the Privacy Policy (DPDP compliant)'
    ];
    if (!required.every(r => (data.consent || []).includes(r)))
      e.consent = 'All three declarations are required to proceed';
    return e;
  }
};

const STEP_IDS = ['basic','overview','product','market','traction','financials','funding','team','strategic','documents','compliance'];

// ─── Main hook ───────────────────────────────────────────────
export function useFormStore() {
  const [data, _setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  });
  const [files, setFiles]       = useState({});
  const [step, setStep]         = useState(0);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const autosaveRef = useRef(null);

  // Debounced auto-save
  const setData = useCallback((updater) => {
    _setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, AUTOSAVE_DELAY_MS);
      return next;
    });
  }, []);

  // Force-save immediately
  const saveNow = useCallback(() => {
    clearTimeout(autosaveRef.current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const set = useCallback((field) => (value) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Clear that field's error on input
    setErrors(prev => { if (!prev[field]) return prev; const n = { ...prev }; delete n[field]; return n; });
  }, [setData]);

  const validate = useCallback((targetStep = step) => {
    const stepId = STEP_IDS[targetStep];
    const fn = VALIDATORS[stepId];
    const errs = fn ? fn(data, files) : {};
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [step, data, files]);

  const goNext = useCallback(() => {
    if (!validate()) return false;
    if (step < STEP_IDS.length - 1) {
      setStep(s => s + 1);
      return true;
    }
    return 'done'; // Signal to show score screen
  }, [validate, step]);

  const goBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  const jumpTo = useCallback((i) => {
    if (i <= step) setStep(i);
  }, [step]);

  const score = computeScore(data);

  const resetForm = useCallback(() => {
    _setData({});
    setFiles({});
    setStep(0);
    setErrors({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasDraft = Object.keys(data).length > 0;

  return {
    data, set, setData,
    files, setFiles,
    step, setStep, goNext, goBack, jumpTo,
    errors, setErrors, validate,
    score,
    submitting, setSubmitting,
    saveNow, resetForm,
    hasDraft,
    stepId: STEP_IDS[step],
    totalSteps: STEP_IDS.length,
    isFirst: step === 0,
    isLast: step === STEP_IDS.length - 1
  };
}
