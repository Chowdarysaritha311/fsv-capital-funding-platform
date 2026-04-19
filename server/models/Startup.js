/**
 * FSV Capital — Startup Schema v2
 * ─────────────────────────────────────────────────────────────
 * UPGRADED:
 * - Added indexes for dashboard query performance
 * - Added virtual computed fields
 * - Added stricter validators with user-friendly messages
 * - Added CRM flat export method
 * - Added audit log sub-schema for status changes
 * ─────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');

// ── Audit log: tracks every pipeline status change ───────────
const AuditEntrySchema = new mongoose.Schema({
  changedBy:  { type: String, default: 'system' },
  fromStatus: { type: String },
  toStatus:   { type: String, required: true },
  note:       { type: String },
  changedAt:  { type: Date, default: Date.now }
}, { _id: false });

// ── Main startup schema ───────────────────────────────────────
const StartupSchema = new mongoose.Schema({

  referenceId: {
    type: String, unique: true, index: true,
    default: () => 'FSV-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,4).toUpperCase()
  },

  // ── Section 1: Basic Info ────────────────────────────────
  basicInfo: {
    startupName:     { type: String, required: [true, 'Startup name is required'], trim: true, maxlength: [120, 'Name too long'], index: true },
    website:         { type: String, trim: true, validate: { validator: v => !v || /^https?:\/\/.+\..+/.test(v), message: 'Invalid URL format' } },
    founderNames:    { type: String, required: [true, 'Founder name is required'], trim: true },
    contactEmail:    { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, index: true,
                       validate: { validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Invalid email address' } },
    contactPhone:    { type: String, trim: true },
    linkedinFounder: { type: String, trim: true },
    linkedinCompany: { type: String, trim: true },
    hqCity:          { type: String, required: [true, 'HQ city is required'], trim: true },
    hqCountry:       { type: String, required: [true, 'HQ country is required'], trim: true },
    yearIncorporated:{ type: Number, min: [1990, 'Year too early'], max: [new Date().getFullYear(), 'Year cannot be in the future'] }
  },

  // ── Section 2: Overview ──────────────────────────────────
  overview: {
    problemStatement: { type: String, required: [true, 'Problem statement is required'], minlength: [30, 'Problem statement too short (min 30 chars)'] },
    solutionOverview: { type: String, required: [true, 'Solution overview is required'], minlength: [30, 'Solution overview too short (min 30 chars)'] },
    sectors: {
      type: [String],
      enum: { values: ['AI','Fintech','Blockchain','DeepTech','SaaS','HealthTech','Other'], message: 'Invalid sector: {VALUE}' },
      validate: { validator: v => v.length > 0, message: 'At least one sector is required' },
      index: true
    },
    businessModel:  { type: String, enum: ['B2B','B2C','B2B2C','Marketplace','SaaS','Platform','Other'] },
    currentStage: {
      type: String, required: [true, 'Current stage is required'],
      enum: { values: ['Idea','MVP','Early Revenue','Growth Stage','Scaling'], message: 'Invalid stage' },
      index: true
    }
  },

  // ── Section 3: Product & Tech ─────────────────────────────
  product: {
    coreProductDescription: { type: String, minlength: [20, 'Core product description too short'] },
    techStack:              { type: [String] },
    uniqueValueProposition: { type: String, minlength: [30, 'USP too short (min 30 chars)'] },
    ipPatents:              { type: String },
    demoLink:               { type: String, validate: { validator: v => !v || /^https?:\/\/.+/.test(v), message: 'Invalid demo URL' } }
  },

  // ── Section 4: Market ────────────────────────────────────
  market: {
    tam:             { type: String },
    sam:             { type: String },
    som:             { type: String },
    customerSegment: { type: String },
    keyCompetitors:  { type: String },
    competitiveAdv:  { type: String }
  },

  // ── Section 5: Traction ──────────────────────────────────
  traction: {
    monthlyRevenue:  { type: Number, default: 0, min: [0, 'Revenue cannot be negative'] },
    annualRevenue:   { type: Number, default: 0, min: [0, 'Revenue cannot be negative'] },
    customers:       { type: Number, default: 0, min: [0, 'Customer count cannot be negative'] },
    growthRatePct:   { type: Number, default: 0, min: [0, 'Growth rate cannot be negative'], max: [10000, 'Growth rate too high — please double check'] },
    keyPartnerships: { type: String },
    achievements:    { type: String }
  },

  // ── Section 6: Financials ────────────────────────────────
  financials: {
    raisedToDate:  { type: Number, default: 0, min: 0 },
    existingInv:   { type: String },
    burnRate:      { type: Number, default: 0, min: 0 },
    runway:        { type: Number, default: 0, min: 0, max: [120, 'Runway over 10 years seems unusual'] },
    projectionY1:  { type: Number, min: 0 },
    projectionY2:  { type: Number, min: 0 },
    projectionY3:  { type: Number, min: 0 }
  },

  // ── Section 7: Funding ───────────────────────────────────
  funding: {
    amountUSD: {
      type: Number, required: [true, 'Funding amount is required'],
      min: [10_000, 'Minimum funding ask is $10,000'],
      max: [100_000_000, 'Maximum via this portal is $100M'],
      index: true
    },
    fundingStage: {
      type: String, required: [true, 'Funding stage is required'],
      enum: ['Pre-seed','Seed','Series A','Series B','Series C+','Bridge']
    },
    equityPct:     { type: Number, min: 0, max: 100 },
    useOfFunds:    { type: [String] },
    fundAllocation:{ type: String }
  },

  // ── Section 8: Team ──────────────────────────────────────
  team: {
    founderBackground: { type: String, minlength: [40, 'Founder background too short (min 40 chars)'] },
    coreTeamMembers:   { type: String },
    advisors:          { type: String },
    teamSize:          { type: Number, min: 1 },
    hiringPlan:        { type: String }
  },

  // ── Section 9: Strategic ─────────────────────────────────
  strategicFit: {
    whyFSV:           { type: String },
    fsvValueAdd:      { type: String },
    openToMentorship: { type: String, enum: ['Yes — actively seeking', 'Open to it', "No, we're past that stage"] }
  },

  // ── Section 10: Documents ────────────────────────────────
  documents: {
    pitchDeckPath:      { type: String },
    pitchDeckName:      { type: String },
    financialModelPath: { type: String },
    productDemoPath:    { type: String },
    demoVideoUrl:       { type: String },
    additionalLink:     { type: String }
  },

  // ── Section 11: Compliance ───────────────────────────────
  compliance: {
    isRegistered:   { type: String, enum: ['Yes — incorporated', 'In Progress', 'No — pre-incorporation'] },
    hasLegalIssues: { type: String, enum: ['No', 'Yes — details below'] },
    legalDetails:   { type: String },
    consentItems:   { type: [String] },
    submittedFromIp:{ type: String }
  },

  // ── Deal Score ───────────────────────────────────────────
  dealScore: {
    total:      { type: Number, min: 0, max: 100, index: true },
    grade:      { type: String },
    gradeTier:  { type: String },
    market:     { type: Number, min: 0, max: 20 },
    traction:   { type: Number, min: 0, max: 25 },
    team:       { type: Number, min: 0, max: 20 },
    innovation: { type: Number, min: 0, max: 20 },
    stage:      { type: Number, min: 0, max: 15 },
    bonus:      { type: Number, default: 0 }
  },

  // ── Pipeline (CRM) ───────────────────────────────────────
  pipeline: {
    status: {
      type: String,
      enum: ['Submitted','Under Review','Shortlisted','DD In Progress','Term Sheet','Invested','Declined','On Hold'],
      default: 'Submitted',
      index: true
    },
    assignedTo:  { type: String },
    notes:       { type: String },
    nextAction:  { type: String },
    auditLog:    { type: [AuditEntrySchema], default: [] },
    lastUpdated: { type: Date }
  },

  // ── Auto-filter Flags ────────────────────────────────────
  flags: {
    pitchDeckMissing:       { type: Boolean, default: false },
    sectorMismatch:         { type: Boolean, default: false },
    tractionInsufficient:   { type: Boolean, default: false },
    fundingOutOfRange:      { type: Boolean, default: false },
    contentTooThin:         { type: Boolean, default: false },
    missingRequiredConsent: { type: Boolean, default: false },
    softWarnings:           { type: [String], default: [] },
    autoRejected:           { type: Boolean, default: false, index: true },
    rejectionReason:        { type: String }
  },

  submittedAt: { type: Date, default: Date.now, index: true }

}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// ── Compound indexes for dashboard queries ────────────────────
StartupSchema.index({ 'dealScore.total': -1, 'pipeline.status': 1 });
StartupSchema.index({ 'overview.sectors': 1, 'dealScore.total': -1 });
StartupSchema.index({ 'overview.currentStage': 1, 'flags.autoRejected': 1 });

// ── Virtual: HQ location string ──────────────────────────────
StartupSchema.virtual('hqLocation').get(function () {
  return [this.basicInfo?.hqCity, this.basicInfo?.hqCountry].filter(Boolean).join(', ');
});

// ── Pre-save: append audit log on status change ───────────────
StartupSchema.pre('save', function (next) {
  if (this.isModified('pipeline.status') && !this.isNew) {
    const prev = this._previousStatus || 'Unknown';
    this.pipeline.auditLog.push({ fromStatus: prev, toStatus: this.pipeline.status });
    this.pipeline.lastUpdated = new Date();
  }
  next();
});

// ── Instance method: CRM-ready flat export ────────────────────
StartupSchema.methods.toCRMRecord = function () {
  return {
    'Reference ID':       this.referenceId,
    'Startup Name':       this.basicInfo?.startupName,
    'Website':            this.basicInfo?.website,
    'Founder(s)':         this.basicInfo?.founderNames,
    'Email':              this.basicInfo?.contactEmail,
    'Phone':              this.basicInfo?.contactPhone,
    'HQ':                 this.hqLocation,
    'Year Incorporated':  this.basicInfo?.yearIncorporated,
    'LinkedIn Founder':   this.basicInfo?.linkedinFounder,
    'Sector(s)':          (this.overview?.sectors || []).join('; '),
    'Business Model':     this.overview?.businessModel,
    'Stage':              this.overview?.currentStage,
    'Problem Statement':  this.overview?.problemStatement?.slice(0, 200),
    'USP':                this.product?.uniqueValueProposition?.slice(0, 200),
    'Tech Stack':         (this.product?.techStack || []).join('; '),
    'TAM':                this.market?.tam,
    'MRR (USD)':          this.traction?.monthlyRevenue,
    'ARR (USD)':          this.traction?.annualRevenue,
    'Customers':          this.traction?.customers,
    'MoM Growth (%)':     this.traction?.growthRatePct,
    'Raised to Date':     this.financials?.raisedToDate,
    'Burn Rate':          this.financials?.burnRate,
    'Runway (months)':    this.financials?.runway,
    'Funding Ask (USD)':  this.funding?.amountUSD,
    'Funding Stage':      this.funding?.fundingStage,
    'Equity Offered (%)': this.funding?.equityPct,
    'Use of Funds':       (this.funding?.useOfFunds || []).join('; '),
    'Team Size':          this.team?.teamSize,
    'Deal Score':         this.dealScore?.total,
    'Score Grade':        this.dealScore?.grade,
    'Score — Market':     this.dealScore?.market,
    'Score — Traction':   this.dealScore?.traction,
    'Score — Team':       this.dealScore?.team,
    'Score — Innovation': this.dealScore?.innovation,
    'Score — Stage':      this.dealScore?.stage,
    'Pipeline Status':    this.pipeline?.status,
    'Assigned To':        this.pipeline?.assignedTo,
    'Auto Rejected':      this.flags?.autoRejected ? 'Yes' : 'No',
    'Rejection Reason':   this.flags?.rejectionReason || '',
    'Soft Warnings':      (this.flags?.softWarnings || []).join('; '),
    'Submitted At':       this.submittedAt?.toISOString()
  };
};

// ── Static: Aggregate pipeline stats ─────────────────────────
StartupSchema.statics.getPipelineStats = async function () {
  return this.aggregate([
    { $facet: {
      byStatus:  [{ $group: { _id: '$pipeline.status', count: { $sum: 1 } } }],
      bySector:  [{ $unwind: '$overview.sectors' }, { $group: { _id: '$overview.sectors', count: { $sum: 1 }, avgScore: { $avg: '$dealScore.total' } } }],
      byStage:   [{ $group: { _id: '$overview.currentStage', count: { $sum: 1 }, avgScore: { $avg: '$dealScore.total' } } }],
      scoreHist: [{ $bucket: { groupBy: '$dealScore.total', boundaries: [0,20,40,60,80,100], default: 'Other', output: { count: { $sum: 1 } } } }],
      totals:    [{ $group: { _id: null, total: { $sum: 1 }, avgScore: { $avg: '$dealScore.total' }, maxScore: { $max: '$dealScore.total' }, autoRejected: { $sum: { $cond: ['$flags.autoRejected', 1, 0] } } } }]
    }}
  ]);
};

module.exports = mongoose.model('Startup', StartupSchema);
