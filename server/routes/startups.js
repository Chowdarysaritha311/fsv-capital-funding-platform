/**
 * FSV Capital — Startup Routes v2
 * ─────────────────────────────────────────────────────────────
 * UPGRADED:
 * - express-validator on submit endpoint
 * - Pipeline stats endpoint for dashboard
 * - Full-text search on list
 * - Bulk status update endpoint
 * - Improved error messages
 * ─────────────────────────────────────────────────────────────
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { body, validationResult } = require('express-validator');
const router   = express.Router();

const Startup         = require('../models/Startup');
const { calculateDealScore } = require('../utils/scoring');
const { applyFilterRules }   = require('../utils/filterRules');
const { sendConfirmationEmail, sendInternalAlert } = require('../utils/emailService');

// ─── File Upload Configuration ───────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, new Date().getFullYear().toString());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').slice(0, 40);
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const rules = {
    pitchDeck:      /^\.pdf$/i,
    financialModel: /^\.(pdf|xlsx|xls)$/i,
    productDemo:    /^\.(pdf|png|jpg|jpeg|zip)$/i
  };
  const ext = path.extname(file.originalname).toLowerCase();
  const rule = rules[file.fieldname];
  if (!rule) return cb(new Error(`Unknown upload field: ${file.fieldname}`), false);
  if (!rule.test(ext)) {
    const friendly = { pitchDeck: 'PDF only', financialModel: 'PDF, XLSX, or XLS', productDemo: 'PDF, image, or ZIP' };
    return cb(new Error(`Invalid file type for ${file.fieldname}. Accepted: ${friendly[file.fieldname] || ext}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 3
  }
}).fields([
  { name: 'pitchDeck',      maxCount: 1 },
  { name: 'financialModel', maxCount: 1 },
  { name: 'productDemo',    maxCount: 1 }
]);

// ─── Validation rules for submit ─────────────────────────────
const submitValidation = [
  body('data').custom(val => {
    try { JSON.parse(val); return true; } catch { throw new Error('Invalid form data format'); }
  })
];

// ─── POST /submit ────────────────────────────────────────────
router.post('/submit', submitValidation, (req, res, next) => {
  // Run multer first, then validation
  upload(req, res, async (uploadErr) => {
    if (uploadErr instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        detail: uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Maximum size is 25MB.'
          : uploadErr.message
      });
    }
    if (uploadErr) {
      return res.status(400).json({ success: false, error: uploadErr.message });
    }

    const valErrors = validationResult(req);
    if (!valErrors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: valErrors.array() });
    }

    try {
      // Parse body
      let raw = {};
      try { raw = req.body.data ? JSON.parse(req.body.data) : req.body; }
      catch { return res.status(400).json({ success: false, error: 'Could not parse form data' }); }

      const appData = normalizeFormData(raw);

      // ── Smart filter rules ──────────────────────────────
      const filterResult = applyFilterRules(appData, req.files || {});
      if (filterResult.hardRejected) {
        return res.status(422).json({
          success: false,
          error: 'Application did not meet intake requirements',
          reasons: filterResult.hardReasons,
          hint: 'Please address the issues above and resubmit.'
        });
      }

      // ── Deal score ──────────────────────────────────────
      const scoreResult = calculateDealScore(appData);

      // ── Build doc paths ─────────────────────────────────
      const docs = {};
      if (req.files?.pitchDeck?.[0]) {
        docs.pitchDeckPath = req.files.pitchDeck[0].path;
        docs.pitchDeckName = req.files.pitchDeck[0].originalname;
      }
      if (req.files?.financialModel?.[0]) docs.financialModelPath = req.files.financialModel[0].path;
      if (req.files?.productDemo?.[0])    docs.productDemoPath    = req.files.productDemo[0].path;

      // ── Build and save startup document ────────────────
      const startup = new Startup({
        ...appData,
        documents: { ...appData.documents, ...docs },
        dealScore: {
          total:      scoreResult.total,
          grade:      scoreResult.grade.label,
          gradeTier:  scoreResult.grade.tier,
          market:     scoreResult.dims.market.score,
          traction:   scoreResult.dims.traction.score,
          team:       scoreResult.dims.team.score,
          innovation: scoreResult.dims.innovation.score,
          stage:      scoreResult.dims.stage.score,
          bonus:      scoreResult.bonus
        },
        flags: {
          ...filterResult.flags,
          softWarnings: filterResult.softWarnings
        },
        pipeline: {
          status: 'Submitted',
          auditLog: [{ toStatus: 'Submitted', note: 'Initial submission' }],
          lastUpdated: new Date()
        },
        compliance: {
          ...appData.compliance,
          submittedFromIp: req.ip
        },
        submittedAt: new Date()
      });

      await startup.save();

      // ── Async emails (fire-and-forget) ──────────────────
      const email = startup.basicInfo?.contactEmail;
      if (email) {
        Promise.allSettled([
          sendConfirmationEmail({ to: email, startupName: startup.basicInfo.startupName, referenceId: startup.referenceId, dealScore: scoreResult.total }),
          sendInternalAlert({ startup, dealScore: scoreResult.total, referenceId: startup.referenceId })
        ]).then(results => {
          results.forEach((r, i) => { if (r.status === 'rejected') console.error(`[Email ${i}] Failed:`, r.reason?.message); });
        });
      }

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully. Check your email for confirmation.',
        referenceId: startup.referenceId,
        startupId:   startup._id,
        dealScore:   scoreResult,
        warnings:    filterResult.softWarnings.length > 0 ? filterResult.softWarnings : undefined
      });

    } catch (err) {
      if (err.name === 'ValidationError') {
        const msgs = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ success: false, error: 'Data validation failed', details: msgs });
      }
      if (err.code === 11000) {
        return res.status(409).json({ success: false, error: 'A duplicate application was detected. Please wait before resubmitting.' });
      }
      next(err);
    }
  });
});

// ─── GET / — Dashboard list ──────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1, limit = 25, sort = '-dealScore.total',
      status, sector, stage, minScore, maxScore, search, rejected
    } = req.query;

    const filter = {};
    if (status)   filter['pipeline.status'] = status;
    if (sector)   filter['overview.sectors'] = { $in: Array.isArray(sector) ? sector : [sector] };
    if (stage)    filter['overview.currentStage'] = stage;
    if (rejected !== undefined) filter['flags.autoRejected'] = rejected === 'true';

    if (minScore || maxScore) {
      filter['dealScore.total'] = {};
      if (minScore) filter['dealScore.total'].$gte = parseInt(minScore);
      if (maxScore) filter['dealScore.total'].$lte = parseInt(maxScore);
    }

    if (search) {
      filter.$or = [
        { 'basicInfo.startupName': { $regex: search, $options: 'i' } },
        { 'basicInfo.founderNames': { $regex: search, $options: 'i' } },
        { 'basicInfo.contactEmail': { $regex: search, $options: 'i' } },
        { 'overview.problemStatement': { $regex: search, $options: 'i' } }
      ];
    }

    const safeLimit = Math.min(parseInt(limit), 100);

    const [startups, total] = await Promise.all([
      Startup.find(filter)
        .sort(sort)
        .skip((parseInt(page) - 1) * safeLimit)
        .limit(safeLimit)
        .select('referenceId basicInfo overview funding traction dealScore pipeline flags submittedAt -__v'),
      Startup.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: startups,
      pagination: { total, page: parseInt(page), limit: safeLimit, pages: Math.ceil(total / safeLimit) }
    });
  } catch (err) { next(err); }
});

// ─── GET /stats — Pipeline statistics for dashboard ─────────
router.get('/stats', async (req, res, next) => {
  try {
    const [stats] = await Startup.getPipelineStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

// ─── GET /:id — Single startup ───────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id).select('-__v');
    if (!startup) return res.status(404).json({ success: false, error: 'Application not found' });
    res.json({ success: true, data: startup });
  } catch (err) { next(err); }
});

// ─── PATCH /:id/status — Update pipeline status ──────────────
router.patch('/:id/status', [
  body('status').isIn(['Submitted','Under Review','Shortlisted','DD In Progress','Term Sheet','Invested','Declined','On Hold'])
    .withMessage('Invalid status value')
], async (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });

  try {
    const { status, assignedTo, notes, nextAction, changedBy } = req.body;
    const startup = await Startup.findById(req.params.id);
    if (!startup) return res.status(404).json({ success: false, error: 'Not found' });

    const prevStatus = startup.pipeline.status;
    startup._previousStatus = prevStatus;
    startup.pipeline.status     = status;
    startup.pipeline.assignedTo = assignedTo || startup.pipeline.assignedTo;
    startup.pipeline.notes      = notes || startup.pipeline.notes;
    startup.pipeline.nextAction = nextAction;
    startup.pipeline.lastUpdated = new Date();
    startup.pipeline.auditLog.push({ changedBy: changedBy || 'system', fromStatus: prevStatus, toStatus: status, note: notes });

    await startup.save();
    res.json({ success: true, data: { status, auditLog: startup.pipeline.auditLog } });
  } catch (err) { next(err); }
});

// ─── GET /export/csv ─────────────────────────────────────────
router.get('/export/csv', async (req, res, next) => {
  try {
    const { status, sector, minScore } = req.query;
    const filter = {};
    if (status) filter['pipeline.status'] = status;
    if (sector) filter['overview.sectors'] = { $in: [sector] };
    if (minScore) filter['dealScore.total'] = { $gte: parseInt(minScore) };

    const startups = await Startup.find(filter).sort('-dealScore.total').limit(1000);
    if (!startups.length) return res.status(404).json({ success: false, error: 'No records found' });

    const records = startups.map(s => s.toCRMRecord());
    const headers = Object.keys(records[0]);
    const rows    = records.map(r => headers.map(h => {
      const val = String(r[h] ?? '').replace(/"/g, '""');
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
    }).join(','));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fsv-pipeline-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send([headers.join(','), ...rows].join('\r\n'));
  } catch (err) { next(err); }
});

// ─── Helper: Normalize flat/nested form data ─────────────────
function normalizeFormData(raw) {
  if (raw.basicInfo) return raw; // Already structured

  return {
    basicInfo: {
      startupName:      raw.startup_name?.trim(),
      website:          raw.website?.trim(),
      founderNames:     raw.founder_name?.trim(),
      contactEmail:     raw.email?.trim().toLowerCase(),
      contactPhone:     raw.phone?.trim(),
      linkedinFounder:  raw.linkedin_founder?.trim(),
      linkedinCompany:  raw.linkedin_company?.trim(),
      hqCity:           raw.hq_city?.trim(),
      hqCountry:        raw.hq_country?.trim(),
      yearIncorporated: raw.year ? parseInt(raw.year) : undefined
    },
    overview: {
      problemStatement: raw.problem?.trim(),
      solutionOverview: raw.solution?.trim(),
      sectors:   Array.isArray(raw.sectors) ? raw.sectors : (raw.sector ? [raw.sector] : []),
      businessModel:    raw.business_model,
      currentStage:     raw.stage
    },
    product: {
      coreProductDescription: raw.core_product?.trim(),
      techStack:   Array.isArray(raw.tech_stack) ? raw.tech_stack : [],
      uniqueValueProposition: raw.usp?.trim(),
      ipPatents:              raw.ip_patents?.trim(),
      demoLink:               raw.demo_link?.trim()
    },
    market: {
      tam:             raw.tam?.trim(),
      sam:             raw.sam?.trim(),
      som:             raw.som?.trim(),
      customerSegment: raw.customer_segment?.trim(),
      keyCompetitors:  raw.competitors?.trim(),
      competitiveAdv:  raw.advantage?.trim()
    },
    traction: {
      monthlyRevenue:  parseFloat(raw.revenue_monthly || 0) || 0,
      annualRevenue:   parseFloat(raw.revenue_annual  || 0) || 0,
      customers:       parseInt(raw.customers || 0) || 0,
      growthRatePct:   parseFloat(raw.growth_rate || 0) || 0,
      keyPartnerships: raw.partnerships?.trim(),
      achievements:    raw.achievements?.trim()
    },
    financials: {
      raisedToDate:  parseFloat(raw.raised_to_date || 0) || 0,
      existingInv:   raw.investors?.trim(),
      burnRate:      parseFloat(raw.burn_rate || 0) || 0,
      runway:        parseFloat(raw.runway || 0) || 0,
      projectionY1:  parseFloat(raw.proj_y1 || 0) || undefined,
      projectionY2:  parseFloat(raw.proj_y2 || 0) || undefined,
      projectionY3:  parseFloat(raw.proj_y3 || 0) || undefined
    },
    funding: {
      amountUSD:     parseFloat(raw.amount || 0),
      fundingStage:  raw.funding_stage,
      equityPct:     raw.equity ? parseFloat(raw.equity) : undefined,
      useOfFunds:    Array.isArray(raw.use_of_funds) ? raw.use_of_funds : [],
      fundAllocation: raw.fund_detail?.trim()
    },
    team: {
      founderBackground: raw.founder_bg?.trim(),
      coreTeamMembers:   raw.core_team?.trim(),
      advisors:          raw.advisors?.trim(),
      teamSize:          raw.team_size ? parseInt(raw.team_size) : undefined,
      hiringPlan:        raw.hiring_plan
    },
    strategicFit: {
      whyFSV:           raw.why_fsv?.trim(),
      fsvValueAdd:      raw.fsv_value?.trim(),
      openToMentorship: raw.mentorship
    },
    documents: {
      demoVideoUrl:   raw.demo_video?.trim(),
      additionalLink: raw.additional_link?.trim()
    },
    compliance: {
      isRegistered:   raw.registered,
      hasLegalIssues: raw.legal_issues,
      legalDetails:   raw.legal_detail?.trim(),
      consentItems:   Array.isArray(raw.consent) ? raw.consent : []
    }
  };
}

module.exports = router;
