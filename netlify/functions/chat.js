const https = require('https');

exports.handler = async (event) => {
  // Только POST запросы
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, productData, analysisData } = JSON.parse(event.body);

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    // Строим контекст из реальных данных пользователя
    let contextBlock = '';
    if (productData) {
      const geo = Array.isArray(productData.geography) ? productData.geography.join(', ') : (productData.geography || '');
      const adv = Array.isArray(productData.advantages) ? productData.advantages.join(', ') : (productData.advantages || '');
      contextBlock += `\nПродукт пользователя:
- Сфера: ${productData.area || ''}
- Сегмент: ${productData.segment || ''}
- Название: ${productData.product || ''}
- Описание: ${productData.description || ''}
- География: ${geo}
- Преимущества: ${adv}
- Цена: ${productData.price || ''}`;
    }
    if (analysisData) {
      if (analysisData.market) {
        const competitors = (analysisData.market.rows || []).map(r => r[0]).join(', ');
        contextBlock += `\nВыявленные конкуренты: ${competitors}`;
        if (analysisData.market.summary) contextBlock += `\nВыводы по рынку: ${analysisData.market.summary.join('; ')}`;
      }
      if (analysisData.economics && analysisData.economics.summary) {
        contextBlock += `\nВыводы по экономике: ${analysisData.economics.summary.join('; ')}`;
      }
      if (analysisData.strategy) {
        const fin = analysisData.strategy.finance || {};
        contextBlock += `\nФинансы: инвестиции ${fin.totalInvest || ''}, ARR ${fin.arr || ''}, ROI ${fin.roi || ''}, payback ${fin.payback || ''}`;
        if (analysisData.strategy.criticalRec) contextBlock += `\nКлючевая рекомендация: ${analysisData.strategy.criticalRec}`;
      }
    }

    const systemPrompt = `Ты NOVA - ассистент платформы CIPHER v3 для конкурентного анализа.
Отвечай по-русски, конкретно и по существу (2-3 абзаца), опираясь на данные анализа пользователя.
Не выдумывай данные которых нет в контексте — лучше скажи что информации недостаточно.
${contextBlock || 'Данные анализа ещё не загружены. Отвечай на общие вопросы о конкурентном анализе.'}`;

    const requestData = JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    return new Promise((resolve) => {
      const req = https.request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
          'Authorization': `Bearer ${apiKey}`
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]) {
              const answer = parsed.choices[0].message.content;
              resolve({
                statusCode: 200,
                body: JSON.stringify({ answer })
              });
            } else {
              resolve({
                statusCode: 500,
                body: JSON.stringify({ error: 'Invalid response from OpenAI' })
              });
            }
          } catch (e) {
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'Failed to parse response' })
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: error.message })
        });
      });

      req.write(requestData);
      req.end();
    });

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
