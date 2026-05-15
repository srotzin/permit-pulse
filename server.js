const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '256kb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Chat endpoint — Kimi K2 via OpenRouter
app.post('/api/chat', async (req, res) => {
  try {
    const { question, context } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing question' });
    }
    if (question.length > 1000) {
      return res.status(400).json({ error: 'Question too long' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = `You are the Permit Pulse Analyst — a senior construction market strategist for Simpson Strong-Tie. You have access to live data on permits, housing starts, builder confidence, mortgage rates, embed sales (SSTB/MASA/STHD foundation products that lead starts by 60-90 days), market segment performance, and the Permit-to-Start Conversion Velocity (PSCV) score by state.

Style:
- Direct and analytical. Talk like a strategist who knows the business.
- Cite specific numbers from the data when answering.
- Lead with the answer, not preamble.
- Use bullet points or short paragraphs. No long explanations.
- When you don't know something, say so plainly.
- Format key numbers in **bold**. Use line breaks between thoughts.

Current dataset:
${JSON.stringify(context, null, 2)}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://permit-pulse-wheat.vercel.app',
        'X-Title': 'Permit Pulse'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-0905',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.4,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);
      return res.status(502).json({ error: 'AI service error', detail: errText.substring(0, 200) });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No response';
    res.json({ answer });
  } catch (e) {
    console.error('Chat error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Permit Pulse on port ${PORT}`));
