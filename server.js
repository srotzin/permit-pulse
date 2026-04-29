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

app.get('/.well-known/agent-card.json', (req, res) => res.json({
  protocolVersion: '0.3.0',
  name: 'permit-pulse',
  description: "Permit Pulse — construction permit telemetry layer for the Hive Civilization.",
  url: 'https://permit-pulse.onrender.com',
  version: '1.0.0',
  provider: { organization: 'Hive Civilization', url: 'https://hiveagentiq.com' },
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ['application/json'],
  defaultOutputModes: ['application/json'],
  authentication: { schemes: ['x402', 'api-key'] },
  payment: {
    protocol: 'x402', currency: 'USDC', network: 'base',
    address: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'
  },
  extensions: {
    hive_pricing: {
      currency: 'USDC', network: 'base', model: 'per_call',
      first_call_free: true, loyalty_threshold: 6,
      loyalty_message: 'Every 6th paid call is free'
    }
  },
  bogo: {
    first_call_free: true, loyalty_threshold: 6,
    pitch: "Pay this once, your 6th paid call is on the house. New here? Add header 'x-hive-did' to claim your first call free.",
    claim_with: 'x-hive-did header'
  }
}));

app.get('/.well-known/ap2.json', (req, res) => res.json({
  ap2_version: '1.0',
  agent: 'permit-pulse',
  payment_methods: ['x402-usdc-base'],
  treasury: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
  bogo: { first_call_free: true, loyalty_threshold: 6, claim_with: 'x-hive-did header' }
}));

app.listen(5000, () => console.log('Permit Pulse running on port 5000'));
