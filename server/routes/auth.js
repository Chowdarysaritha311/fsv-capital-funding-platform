const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const draftStore = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'fsv-secret';

router.post('/draft', (req, res) => {
  const { email, formData } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  draftStore.set(token, { email, formData, savedAt: new Date() });
  res.json({ success: true, token });
});

router.get('/draft/:token', (req, res) => {
  try {
    jwt.verify(req.params.token, JWT_SECRET);
    const draft = draftStore.get(req.params.token);
    if (!draft) return res.status(404).json({ success: false, error: 'Draft not found' });
    res.json({ success: true, ...draft });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

module.exports = router;