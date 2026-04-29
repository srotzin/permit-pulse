const express = require('express');
const path    = require('path');
const https   = require('https');
const app     = express();
app.use(express.json());

// ─── HiveAI helper ─────────────────────────────────────────────────────────
const HIVEAI_KEY   = 'hive_internal_125e04e071e8829be631ea0216dd4a0c9b707975fcecaf8c62c6a2ab43327d46';
const HIVEAI_MODEL = 'meta-llama/llama-3.1-8b-instruct';

function callHiveAI(systemPrompt, userMessage, maxTokens = 150) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: HIVEAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    });
    const options = {
      hostname: 'hive-ai-1.onrender.com',
      path:     '/v1/chat/completions',
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${HIVEAI_KEY}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices[0].message.content.trim());
        } catch {
          resolve('PermitPulse is monitoring regulatory windows. Key permit types are currently active — consult jurisdiction-specific portals for submission deadlines and compliance windows.');
        }
      });
    });
    req.on('error', () => {
      resolve('PermitPulse is monitoring regulatory windows. Key permit types are currently active — consult jurisdiction-specific portals for submission deadlines and compliance windows.');
    });
    req.setTimeout(20000, () => {
      req.destroy();
      resolve('PermitPulse is monitoring regulatory windows. Key permit types are currently active — consult jurisdiction-specific portals for submission deadlines and compliance windows.');
    });
    req.write(payload);
    req.end();
  });
}

// ─── Health check BEFORE static ───────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'permit-pulse' }));

// ─── AI Permit Brief ($0.03/call) ───────────────────────────────────────────────
app.get('/ai/permit-brief', async (req, res) => {
  try {
    const jurisdiction = req.query.jurisdiction || req.body && req.body.jurisdiction || 'general';
    const permitType   = req.query.permit_type  || req.body && req.body.permit_type  || 'general';

    const systemPrompt = (
      'You are PermitPulse \u2014 the permit and regulatory signal layer. ' +
      'Identify current permit opportunities and compliance windows. ' +
      'What permits are time-sensitive right now? 2-3 sentences.'
    );
    const userMsg = (
      `Jurisdiction: ${jurisdiction}. Permit type: ${permitType}. ` +
      'Identify time-sensitive permit opportunities and current compliance windows.'
    );

    const brief = await callHiveAI(systemPrompt, userMsg);

    res.json({
      success:        true,
      brief,
      active_windows: [
        { type: permitType, jurisdiction, status: 'open', note: 'Verify deadlines at your local authority portal.' },
      ],
      price_usdc: 0.03,
    });
  } catch (err) {
    console.error('[GET /ai/permit-brief]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Also support POST for body-based requests
app.post('/ai/permit-brief', async (req, res) => {
  try {
    const { jurisdiction = 'general', permit_type: permitType = 'general' } = req.body || {};

    const systemPrompt = (
      'You are PermitPulse \u2014 the permit and regulatory signal layer. ' +
      'Identify current permit opportunities and compliance windows. ' +
      'What permits are time-sensitive right now? 2-3 sentences.'
    );
    const userMsg = (
      `Jurisdiction: ${jurisdiction}. Permit type: ${permitType}. ` +
      'Identify time-sensitive permit opportunities and current compliance windows.'
    );

    const brief = await callHiveAI(systemPrompt, userMsg);

    res.json({
      success:        true,
      brief,
      active_windows: [
        { type: permitType, jurisdiction, status: 'open', note: 'Verify deadlines at your local authority portal.' },
      ],
      price_usdc: 0.03,
    });
  } catch (err) {
    console.error('[POST /ai/permit-brief]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname)));
app.listen(5000, () => console.log('Permit Pulse running on port 5000'));
