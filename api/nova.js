const https = require('https');

function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Parse error: ' + raw.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, product, area, segment, geography, competitors, context, apiKey: clientKey } = body;

    const apiKey = (clientKey && (clientKey.startsWith('sk-ant-') || clientKey.startsWith('sk-')) && clientKey.length > 20)
      ? clientKey
      : process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'Нет ключа API' });
      return;
    }

    const systemPrompt = `Ты NOVA — умный ассистент по конкурентному анализу. Ты помогаешь пользователю разобраться в результатах анализа его продукта.

Контекст анализа:
- Продукт: ${product || 'не указан'}
- Сфера: ${area || 'не указана'}
- Сегмент: ${segment || 'не указан'}
- География: ${Array.isArray(geography) ? geography.join(', ') : (geography || 'не указана')}
- Конкуренты: ${competitors || 'определены автоматически'}
${context ? `\nДанные анализа:\n${context}` : ''}

Правила:
- Отвечай коротко и по делу, 2-4 предложения максимум
- Говори как умный консультант, без воды и канцелярита
- Если вопрос про данные из анализа — ссылайся на конкретные вкладки (Рынок, Аудитория, SWOT и т.д.)
- Отвечай на русском языке`;

    const isAnthropic = apiKey.startsWith('sk-ant-');

    if (isAnthropic) {
      const resp = await httpPost('api.anthropic.com', '/v1/messages',
        { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }]
        }
      );
      if (resp.error) throw new Error(resp.error.message || JSON.stringify(resp.error));
      res.status(200).json({ reply: resp.content[0].text });
    } else {
      const resp = await httpPost('api.openai.com', '/v1/chat/completions',
        { 'Authorization': `Bearer ${apiKey}` },
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 300
        }
      );
      if (resp.error) throw new Error(resp.error.message);
      res.status(200).json({ reply: resp.choices[0].message.content });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
