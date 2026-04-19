import React, { useState, useEffect } from 'react';

const STEPS = [
  'Basic Info', 'Overview', 'Product', 'Market',
  'Traction', 'Financials', 'Funding', 'Team',
  'Strategic', 'Documents', 'Compliance'
];

function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fsv_draft') || '{}'); }
    catch { return {}; }
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');
  const [score, setScore] = useState(0);

  useEffect(() => {
    localStorage.setItem('fsv_draft', JSON.stringify(data));
    setScore(calcScore(data));
  }, [data]);

  function calcScore(d) {
    let s = 0;
    if (d.startup_name) s += 5;
    if (d.email) s += 5;
    if (d.problem?.length > 30) s += 10;
    if (d.solution?.length > 30) s += 10;
    if (d.usp?.length > 30) s += 10;
    if (d.tam) s += 8;
    if (parseFloat(d.revenue_monthly) > 0) s += 15;
    if (parseFloat(d.growth_rate) > 10) s += 10;
    if (d.founder_bg?.length > 50) s += 12;
    if (d.amount) s += 5;
    const sm = { Idea: 0, MVP: 3, 'Early Revenue': 6, 'Growth Stage': 8, Scaling: 10 };
    s += sm[d.stage] || 0;
    return Math.min(s, 100);
  }

  function set(field) {
    return (e) => {
      const val = e.target ? e.target.value : e;
      setData(prev => ({ ...prev, [field]: val }));
      setErrors(prev => ({ ...prev, [field]: null }));
    };
  }

  function validate() {
    const e = {};
    if (step === 0) {
      if (!data.startup_name?.trim()) e.startup_name = 'Required';
      if (!data.founder_name?.trim()) e.founder_name = 'Required';
      if (!data.email?.includes('@')) e.email = 'Valid email required';
    }
    if (step === 1) {
      if (!data.problem || data.problem.length < 20) e.problem = 'Min 20 characters';
      if (!data.solution || data.solution.length < 20) e.solution = 'Min 20 characters';
      if (!data.stage) e.stage = 'Select a stage';
    }
    if (step === 6) {
      if (!data.amount || parseFloat(data.amount) < 10000) e.amount = 'Min $10,000';
      if (!data.funding_stage) e.funding_stage = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else submit();
  }

  function submit() {
    const id = 'FSV-' + Date.now().toString(36).toUpperCase();
    setRefId(id);
    setSubmitted(true);
    localStorage.removeItem('fsv_draft');
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  if (submitted) return (
    <div style={styles.page}>
      <div style={styles.successCard}>
        <div style={styles.checkmark}>✓</div>
        <h1 style={styles.successTitle}>Application Submitted!</h1>
        <p style={styles.successSub}>FSV Capital will review your application within 5–7 business days.</p>
        <div style={styles.refBox}>{refId}</div>
        <p style={{ color: '#9b9bb0', fontSize: 12 }}>Your Reference ID</p>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#d4a843', margin: '16px 0 4px' }}>{score}</div>
        <p style={{ color: '#9b9bb0', fontSize: 13 }}>Deal Score / 100</p>
        <button style={styles.btnPrimary} onClick={() => { setSubmitted(false); setStep(0); setData({}); }}>
          Submit Another
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.brandTag}>FSV CAPITAL</div>
          <h1 style={styles.headerTitle}>Startup Funding Application</h1>
          <p style={styles.headerSub}>Fueling DeepTech, Fintech & Future Innovation</p>
        </div>
        <div style={styles.scoreBadge}>
          <div style={{ fontSize: 11, color: '#9b9bb0', marginBottom: 2 }}>LIVE SCORE</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#d4a843' }}>{score}</div>
          <div style={{ fontSize: 11, color: '#9b9bb0' }}>/100</div>
        </div>
      </div>

      {/* Progress */}
      <div style={styles.progressRail}>
        <div style={{ ...styles.progressFill, width: progress + '%' }} />
      </div>

      {/* Step tabs */}
      <div style={styles.stepTabs}>
        {STEPS.map((s, i) => (
          <div key={i} onClick={() => i < step && setStep(i)}
            style={{ ...styles.stepTab, ...(i === step ? styles.stepTabActive : {}), ...(i < step ? styles.stepTabDone : {}) }}>
            {i < step ? '✓' : i + 1}. {s}
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={styles.formCard}>
        <div style={styles.sectionLabel}>Section {step + 1} of {STEPS.length}</div>
        <h2 style={styles.sectionTitle}>{STEPS[step]}</h2>

        {step === 0 && <BasicInfo data={data} set={set} errors={errors} />}
        {step === 1 && <Overview data={data} set={set} errors={errors} />}
        {step === 2 && <Product data={data} set={set} errors={errors} />}
        {step === 3 && <Market data={data} set={set} errors={errors} />}
        {step === 4 && <Traction data={data} set={set} errors={errors} />}
        {step === 5 && <Financials data={data} set={set} errors={errors} />}
        {step === 6 && <Funding data={data} set={set} errors={errors} />}
        {step === 7 && <Team data={data} set={set} errors={errors} />}
        {step === 8 && <Strategic data={data} set={set} errors={errors} />}
        {step === 9 && <Documents data={data} set={set} errors={errors} />}
        {step === 10 && <Compliance data={data} set={set} errors={errors} />}
      </div>

      {/* Nav */}
      <div style={styles.navBar}>
        <div style={{ fontSize: 12, color: '#9b9bb0' }}>
          Step {step + 1} — {STEPS[step]}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.btnGhost} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          <button style={styles.btnPrimary} onClick={next}>{step === STEPS.length - 1 ? 'Submit →' : 'Continue →'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>{label}{required && <span style={{ color: '#d4a843' }}> *</span>}</label>
      {hint && <div style={styles.hint}>{hint}</div>}
      {children}
      {error && <div style={styles.error}>⚠ {error}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', error }) {
  return <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder}
    style={{ ...styles.input, ...(error ? styles.inputError : {}) }} />;
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows}
    style={styles.textarea} />;
}

function Select({ value, onChange, options }) {
  return (
    <select value={value || ''} onChange={onChange} style={styles.input}>
      <option value=''>Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Chips({ options, value = [], onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {options.map(o => (
        <span key={o} onClick={() => toggle(o)} style={{ ...styles.chip, ...(value.includes(o) ? styles.chipSelected : {}) }}>
          {value.includes(o) ? '✓ ' : ''}{o}
        </span>
      ))}
    </div>
  );
}

function Radios({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {options.map(o => (
        <span key={o} onClick={() => onChange(o)} style={{ ...styles.chip, ...(value === o ? styles.chipSelected : {}) }}>
          {value === o ? '● ' : ''}{o}
        </span>
      ))}
    </div>
  );
}

function BasicInfo({ data, set, errors }) {
  return (
    <div style={styles.grid2}>
      <Field label="Startup Name" required error={errors.startup_name}><Input value={data.startup_name} onChange={set('startup_name')} placeholder="Acme Technologies" error={errors.startup_name} /></Field>
      <Field label="Website URL"><Input value={data.website} onChange={set('website')} placeholder="https://acme.com" type="url" /></Field>
      <Field label="Founder Name(s)" required error={errors.founder_name}><Input value={data.founder_name} onChange={set('founder_name')} placeholder="John Doe" error={errors.founder_name} /></Field>
      <Field label="Contact Email" required error={errors.email}><Input value={data.email} onChange={set('email')} placeholder="founder@acme.com" type="email" error={errors.email} /></Field>
      <Field label="Phone"><Input value={data.phone} onChange={set('phone')} placeholder="+91 98765 43210" /></Field>
      <Field label="Year Incorporated"><Input value={data.year} onChange={set('year')} placeholder="2022" type="number" /></Field>
      <Field label="HQ City" required><Input value={data.hq_city} onChange={set('hq_city')} placeholder="Bengaluru" /></Field>
      <Field label="HQ Country" required><Input value={data.hq_country} onChange={set('hq_country')} placeholder="India" /></Field>
    </div>
  );
}

function Overview({ data, set, errors }) {
  return (
    <>
      <Field label="Problem Statement" required error={errors.problem} hint="Min 20 characters — be specific"><Textarea value={data.problem} onChange={set('problem')} placeholder="What problem are you solving?" /></Field>
      <Field label="Solution Overview" required error={errors.solution}><Textarea value={data.solution} onChange={set('solution')} placeholder="How does your product solve it?" /></Field>
      <Field label="Sector"><Chips options={['AI','Fintech','Blockchain','DeepTech','SaaS','HealthTech','Other']} value={data.sectors || []} onChange={v => set('sectors')({ target: { value: v } })} /></Field>
      <Field label="Business Model"><Select value={data.business_model} onChange={set('business_model')} options={['B2B','B2C','B2B2C','Marketplace','SaaS','Platform','Other']} /></Field>
      <Field label="Current Stage" required error={errors.stage}><Radios options={['Idea','MVP','Early Revenue','Growth Stage','Scaling']} value={data.stage} onChange={v => set('stage')({ target: { value: v } })} /></Field>
    </>
  );
}

function Product({ data, set, errors }) {
  return (
    <>
      <Field label="Core Product Description" required><Textarea value={data.core_product} onChange={set('core_product')} placeholder="What does your product do?" /></Field>
      <Field label="Unique Value Proposition" required><Textarea value={data.usp} onChange={set('usp')} placeholder="What makes you 10x better?" /></Field>
      <Field label="Tech Stack"><Chips options={['AI/ML','Blockchain','Cloud','APIs','Mobile','Web3','IoT','Robotics']} value={data.tech_stack || []} onChange={v => set('tech_stack')({ target: { value: v } })} /></Field>
      <Field label="IP / Patents"><Textarea value={data.ip_patents} onChange={set('ip_patents')} placeholder="Patent numbers or trade secrets..." rows={3} /></Field>
      <Field label="Demo Link"><Input value={data.demo_link} onChange={set('demo_link')} placeholder="https://demo.acme.com" type="url" /></Field>
    </>
  );
}

function Market({ data, set, errors }) {
  return (
    <>
      <div style={styles.grid3}>
        <Field label="TAM" required><Input value={data.tam} onChange={set('tam')} placeholder="$50B globally" /></Field>
        <Field label="SAM"><Input value={data.sam} onChange={set('sam')} placeholder="$5B target region" /></Field>
        <Field label="SOM"><Input value={data.som} onChange={set('som')} placeholder="$200M Year 3" /></Field>
      </div>
      <Field label="Customer Segment" required><Input value={data.customer_segment} onChange={set('customer_segment')} placeholder="Enterprise CFOs at mid-market fintechs" /></Field>
      <Field label="Key Competitors" required><Textarea value={data.competitors} onChange={set('competitors')} placeholder="1. Company A&#10;2. Company B" /></Field>
      <Field label="Competitive Advantage" required><Textarea value={data.advantage} onChange={set('advantage')} placeholder="Our moat is..." /></Field>
    </>
  );
}

function Traction({ data, set, errors }) {
  return (
    <>
      <div style={styles.grid3}>
        <Field label="Monthly Revenue (USD)"><Input value={data.revenue_monthly} onChange={set('revenue_monthly')} placeholder="50000" type="number" /></Field>
        <Field label="Annual Revenue (USD)"><Input value={data.revenue_annual} onChange={set('revenue_annual')} placeholder="600000" type="number" /></Field>
        <Field label="Customers / Users"><Input value={data.customers} onChange={set('customers')} placeholder="1250" type="number" /></Field>
      </div>
      <Field label="MoM Growth Rate (%)" hint="Month-over-month growth">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <input type="range" min="0" max="200" value={data.growth_rate || 0} onChange={set('growth_rate')} style={{ flex: 1, accentColor: '#d4a843' }} />
          <span style={{ color: '#d4a843', fontWeight: 700, minWidth: 50 }}>{data.growth_rate || 0}%</span>
        </div>
      </Field>
      <Field label="Key Partnerships"><Textarea value={data.partnerships} onChange={set('partnerships')} placeholder="Strategic partnerships..." rows={3} /></Field>
      <Field label="Notable Achievements"><Textarea value={data.achievements} onChange={set('achievements')} placeholder="Awards, press, accelerators..." rows={3} /></Field>
    </>
  );
}

function Financials({ data, set, errors }) {
  return (
    <>
      <div style={styles.grid2}>
        <Field label="Raised to Date (USD)"><Input value={data.raised_to_date} onChange={set('raised_to_date')} placeholder="500000" type="number" /></Field>
        <Field label="Existing Investors"><Input value={data.investors} onChange={set('investors')} placeholder="Y Combinator, Sequoia..." /></Field>
        <Field label="Monthly Burn Rate (USD)"><Input value={data.burn_rate} onChange={set('burn_rate')} placeholder="80000" type="number" /></Field>
        <Field label="Runway (months)"><Input value={data.runway} onChange={set('runway')} placeholder="8" type="number" /></Field>
      </div>
      <div style={styles.grid3}>
        <Field label="Year 1 Projection (USD)"><Input value={data.proj_y1} onChange={set('proj_y1')} placeholder="1000000" type="number" /></Field>
        <Field label="Year 2 Projection (USD)"><Input value={data.proj_y2} onChange={set('proj_y2')} placeholder="3000000" type="number" /></Field>
        <Field label="Year 3 Projection (USD)"><Input value={data.proj_y3} onChange={set('proj_y3')} placeholder="8000000" type="number" /></Field>
      </div>
    </>
  );
}

function Funding({ data, set, errors }) {
  return (
    <>
      <div style={styles.grid2}>
        <Field label="Amount Raising (USD)" required error={errors.amount} hint="Min $10,000"><Input value={data.amount} onChange={set('amount')} placeholder="2000000" type="number" error={errors.amount} /></Field>
        <Field label="Funding Stage" required error={errors.funding_stage}><Select value={data.funding_stage} onChange={set('funding_stage')} options={['Pre-seed','Seed','Series A','Series B','Series C+','Bridge']} /></Field>
        <Field label="Equity Offered (%)"><Input value={data.equity} onChange={set('equity')} placeholder="10" type="number" /></Field>
        <Field label="Timeline to Close"><Select value={data.timeline} onChange={set('timeline')} options={['1 month','2 months','3 months','6 months','12 months']} /></Field>
      </div>
      <Field label="Use of Funds"><Chips options={['Product','Go-to-Market','Hiring','Expansion','R&D','Marketing','Infrastructure']} value={data.use_of_funds || []} onChange={v => set('use_of_funds')({ target: { value: v } })} /></Field>
      <Field label="Detailed Allocation"><Textarea value={data.fund_detail} onChange={set('fund_detail')} placeholder="40% product, 30% hiring..." /></Field>
    </>
  );
}

function Team({ data, set, errors }) {
  return (
    <>
      <Field label="Founder Background" required hint="Education, prior companies, domain expertise"><Textarea value={data.founder_bg} onChange={set('founder_bg')} placeholder="Previously at Google, founded 2 startups..." rows={5} /></Field>
      <Field label="Core Team Members" required><Textarea value={data.core_team} onChange={set('core_team')} placeholder="CTO: Jane Smith — ex-AWS, 10yr distributed systems..." rows={4} /></Field>
      <Field label="Advisors & Mentors"><Textarea value={data.advisors} onChange={set('advisors')} placeholder="[Name] — Former VP at Stripe..." rows={3} /></Field>
      <div style={styles.grid2}>
        <Field label="Team Size"><Input value={data.team_size} onChange={set('team_size')} placeholder="8" type="number" /></Field>
        <Field label="Hiring Plan"><Select value={data.hiring_plan} onChange={set('hiring_plan')} options={['No new hires','1–5 hires','6–15 hires','16–30 hires','30+ hires']} /></Field>
      </div>
    </>
  );
}

function Strategic({ data, set, errors }) {
  return (
    <>
      <Field label="Why FSV Capital?" required hint="Be specific — generic answers score lower"><Textarea value={data.why_fsv} onChange={set('why_fsv')} placeholder="We specifically want FSV because..." rows={5} /></Field>
      <Field label="Value beyond funding?"><Textarea value={data.fsv_value} onChange={set('fsv_value')} placeholder="FSV can help us with..." rows={3} /></Field>
      <Field label="Open to mentorship?"><Radios options={['Yes','Open to it','No']} value={data.mentorship} onChange={v => set('mentorship')({ target: { value: v } })} /></Field>
    </>
  );
}

function Documents({ data, set, errors }) {
  return (
    <>
      <Field label="Pitch Deck" required hint="PDF only — mandatory">
        <div style={styles.uploadZone} onClick={() => document.getElementById('pitch').click()}>
          <div style={{ fontSize: 32 }}>↑</div>
          <div style={{ fontWeight: 500 }}>{data.pitch_deck_name || 'Click to upload PDF'}</div>
          <div style={{ fontSize: 12, color: '#9b9bb0' }}>PDF only · Max 20MB</div>
          <input id="pitch" type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) set('pitch_deck_name')({ target: { value: e.target.files[0].name } }); }} />
        </div>
      </Field>
      <Field label="Demo Video URL"><Input value={data.demo_video} onChange={set('demo_video')} placeholder="https://youtube.com/..." type="url" /></Field>
      <Field label="Additional Link"><Input value={data.additional_link} onChange={set('additional_link')} placeholder="https://drive.google.com/..." type="url" /></Field>
    </>
  );
}

function Compliance({ data, set, errors }) {
  return (
    <>
      <Field label="Company Registered?"><Radios options={['Yes','In Progress','No']} value={data.registered} onChange={v => set('registered')({ target: { value: v } })} /></Field>
      <Field label="Any Legal Issues?"><Radios options={['No','Yes — see details']} value={data.legal_issues} onChange={v => set('legal_issues')({ target: { value: v } })} /></Field>
      {data.legal_issues === 'Yes — see details' && <Field label="Details"><Textarea value={data.legal_detail} onChange={set('legal_detail')} placeholder="Describe..." rows={3} /></Field>}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#854d0e' }}>
        🔒 Data handled under DPDP-compliant privacy standards.
      </div>
      <Field label="Declarations (check all)">
        <Chips
          options={['I consent to sharing info with FSV Capital partners','I confirm data is accurate','I agree to Privacy Policy']}
          value={data.consent || []}
          onChange={v => set('consent')({ target: { value: v } })}
        />
      </Field>
    </>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f6f3', fontFamily: 'system-ui, sans-serif', paddingBottom: 80 },
  header: { background: '#080810', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandTag: { fontSize: 10, fontWeight: 700, color: '#d4a843', letterSpacing: '0.14em', marginBottom: 6 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 700, margin: 0 },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  scoreBadge: { textAlign: 'center', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 10, padding: '12px 20px' },
  progressRail: { height: 3, background: 'rgba(0,0,0,0.08)' },
  progressFill: { height: 3, background: 'linear-gradient(90deg,#d4a843,#e8c06a)', transition: 'width 0.5s ease' },
  stepTabs: { display: 'flex', overflowX: 'auto', background: '#080810', padding: '10px 20px', gap: 4 },
  stepTab: { fontSize: 10, color: 'rgba(255,255,255,0.25)', padding: '4px 8px', whiteSpace: 'nowrap', cursor: 'pointer' },
  stepTabActive: { color: '#d4a843', fontWeight: 700 },
  stepTabDone: { color: 'rgba(255,255,255,0.5)', cursor: 'pointer' },
  formCard: { maxWidth: 720, margin: '32px auto', background: 'white', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#d4a843', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 },
  sectionTitle: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#080810' },
  label: { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 },
  hint: { fontSize: 11, color: '#9ca3af', marginBottom: 5 },
  error: { fontSize: 11, color: '#ef4444', marginTop: 4 },
  input: { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e5e5', borderRadius: 6, outline: 'none', fontFamily: 'inherit', background: '#fafafa', boxSizing: 'border-box' },
  inputError: { borderColor: '#ef4444' },
  textarea: { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e5e5', borderRadius: 6, outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: '#fafafa', boxSizing: 'border-box' },
  chip: { padding: '5px 12px', fontSize: 12, border: '1.5px solid #e5e5e5', borderRadius: 100, cursor: 'pointer', color: '#6b7280', background: '#fafafa' },
  chipSelected: { borderColor: '#d4a843', background: 'rgba(212,168,67,0.08)', color: '#7c5a0d', fontWeight: 500 },
  uploadZone: { border: '2px dashed #ddd', borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer', background: '#fafafa' },
  navBar: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #eee', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  btnPrimary: { background: '#d4a843', color: '#1a0e00', border: 'none', padding: '10px 24px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnGhost: { background: 'white', color: '#374151', border: '1.5px solid #e5e5e5', padding: '10px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 },
  successCard: { maxWidth: 480, margin: '80px auto', background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
  checkmark: { width: 64, height: 64, background: '#d4a843', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#080810' },
  successTitle: { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  successSub: { color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 },
  refBox: { background: '#080810', color: '#d4a843', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, padding: '12px 28px', borderRadius: 6, display: 'inline-block', marginBottom: 8, letterSpacing: '0.06em' },
};

export default App;