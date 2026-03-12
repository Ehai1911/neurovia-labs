const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { area, segment, product, description, geography, advantages, price } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const geo = Array.isArray(geography) ? geography.join(', ') : (geography || 'глобально');
    const adv = Array.isArray(advantages) ? advantages.join(', ') : (advantages || '');

    const prompt = `Ты эксперт по конкурентному анализу. Пользователь описал свой продукт:
- Сфера: ${area}
- Сегмент клиентов: ${segment}
- Название продукта: ${product}
- Описание: ${description}
- География: ${geo}
- Преимущества: ${adv}
- Ценовой диапазон: ${price}

Найди TOP 5 реальных конкурентов именно для этой сферы (${area}) и географии (${geo}). НЕ используй CRM компании если сфера не CRM. Подбери конкурентов релевантных описанию продукта.

Создай полный конкурентный анализ. Верни ТОЛЬКО валидный JSON (без markdown, без \`\`\`) в точно таком формате:

{
  "market": {
    "headers": ["Компания","TAM","CAGR","Доля рынка","Позиция"],
    "rows": [
      ["Конкурент1","$XXB","XX%","XX%","Позиция"],
      ["Конкурент2","$XXB","XX%","XX%","Позиция"],
      ["Конкурент3","$XXB","XX%","XX%","Позиция"],
      ["Конкурент4","$XXB","XX%","XX%","Позиция"],
      ["Конкурент5","$XXB","XX%","XX%","Позиция"]
    ],
    "summary": ["вывод о рынке 1","вывод о рынке 2","вывод о рынке 3"],
    "bestCompany": "Компания для обучения",
    "bestAdvice": "чему именно научиться"
  },
  "audience": {
    "headers": ["Компания","Сегмент","Ключевые роли","Jobs-to-be-done","Зрелость"],
    "rows": [
      ["Конкурент1","сегмент","роли","jobs","уровень"],
      ["Конкурент2","сегмент","роли","jobs","уровень"],
      ["Конкурент3","сегмент","роли","jobs","уровень"],
      ["Конкурент4","сегмент","роли","jobs","уровень"],
      ["Конкурент5","сегмент","роли","jobs","уровень"]
    ],
    "summary": ["вывод 1","вывод 2","вывод 3"],
    "bestCompany": "Компания",
    "bestAdvice": "совет"
  },
  "economics": {
    "headers": ["Компания","Модель","Цена","LTV","CAC","Payback"],
    "rows": [
      ["Конкурент1","модель","цена","LTV","CAC","период"],
      ["Конкурент2","модель","цена","LTV","CAC","период"],
      ["Конкурент3","модель","цена","LTV","CAC","период"],
      ["Конкурент4","модель","цена","LTV","CAC","период"],
      ["Конкурент5","модель","цена","LTV","CAC","период"]
    ],
    "summary": ["вывод 1","вывод 2","вывод 3"],
    "bestCompany": "Компания",
    "bestAdvice": "совет"
  },
  "channels": {
    "headers": ["Компания","Основной GTM","Вторичные","Контент","Бюджет"],
    "rows": [
      ["Конкурент1","GTM","каналы","тип контента","High/Med/Low"],
      ["Конкурент2","GTM","каналы","тип контента","High/Med/Low"],
      ["Конкурент3","GTM","каналы","тип контента","High/Med/Low"],
      ["Конкурент4","GTM","каналы","тип контента","High/Med/Low"],
      ["Конкурент5","GTM","каналы","тип контента","High/Med/Low"]
    ],
    "summary": ["вывод 1","вывод 2","вывод 3"],
    "bestCompany": "Компания",
    "bestAdvice": "совет"
  },
  "product": {
    "headers": ["Компания","Ключевые фичи","AI","Интеграции","Mobile","Барьеры входа"],
    "rows": [
      ["Конкурент1","фичи","Yes/No","кол-во","Yes/No","уровень"],
      ["Конкурент2","фичи","Yes/No","кол-во","Yes/No","уровень"],
      ["Конкурент3","фичи","Yes/No","кол-во","Yes/No","уровень"],
      ["Конкурент4","фичи","Yes/No","кол-во","Yes/No","уровень"],
      ["Конкурент5","фичи","Yes/No","кол-во","Yes/No","уровень"]
    ],
    "summary": ["вывод 1","вывод 2","вывод 3"],
    "bestCompany": "Компания",
    "bestAdvice": "совет"
  },
  "reputation": {
    "headers": ["Компания","Рейтинг G2/App","Отзывов","Главные жалобы","NPS","PR активность"],
    "rows": [
      ["Конкурент1","X.X/5","XXK","жалобы","XX","High/Med/Low"],
      ["Конкурент2","X.X/5","XXK","жалобы","XX","High/Med/Low"],
      ["Конкурент3","X.X/5","XXK","жалобы","XX","High/Med/Low"],
      ["Конкурент4","X.X/5","XXK","жалобы","XX","High/Med/Low"],
      ["Конкурент5","X.X/5","XXK","жалобы","XX","High/Med/Low"]
    ],
    "summary": ["вывод 1","вывод 2","вывод 3"],
    "bestCompany": "Компания",
    "bestAdvice": "совет"
  },
  "macro": {
    "headers": ["Компания","GDPR","SOC2","Локализация","Хранение данных","Стандарты"],
    "rows": [
      ["Конкурент1","Yes/No","Yes/No","регионы","Local/Global","стандарты"],
      ["Конкурент2","Yes/No","Yes/No","регионы","Local/Global","стандарты"],
      ["Конкурент3","Yes/No","Yes/No","регионы","Local/Global","стандарты"],
      ["Конкурент4","Yes/No","Yes/No","регионы","Local/Global","стандарты"],
      ["Конкурент5","Yes/No","Yes/No","регионы","Local/Global","стандарты"]
    ],
    "summary": ["вывод 1","вывод 2","вывод 3"],
    "bestCompany": "Компания",
    "bestAdvice": "совет"
  },
  "strategy": {
    "q1": {
      "goal": "Главная цель первого квартала для ${product} в ${geo}",
      "learnFrom": "Компания1 (что именно) + Компания2 (что именно)",
      "actions": [
        {"title": "Конкретное действие 1", "budget": "$XK", "detail": "детали реализации"},
        {"title": "Конкретное действие 2", "budget": "$XK", "detail": "детали реализации"},
        {"title": "Конкретное действие 3", "budget": "$XK", "detail": "детали реализации"}
      ],
      "metrics": "+XX% конверсии, +$XXXK ARR, -XX% CAC"
    },
    "q2": {
      "goal": "Главная цель второго квартала",
      "learnFrom": "Компания1 (что) + Компания2 (что)",
      "actions": [
        {"title": "Действие 1", "budget": "$XK", "detail": "детали"},
        {"title": "Действие 2", "budget": "$XK", "detail": "детали"},
        {"title": "Действие 3", "budget": "$XK", "detail": "детали"}
      ],
      "metrics": "метрики результата"
    },
    "q3": {
      "goal": "Главная цель третьего квартала",
      "learnFrom": "Компания1 (что) + Компания2 (что)",
      "actions": [
        {"title": "Действие 1", "budget": "$XK", "detail": "детали"},
        {"title": "Действие 2", "budget": "$XK", "detail": "детали"},
        {"title": "Действие 3", "budget": "$XK", "detail": "детали"}
      ],
      "metrics": "метрики результата"
    },
    "q4": {
      "goal": "Главная цель четвёртого квартала",
      "learnFrom": "Компания1 (что) + Компания2 (что)",
      "actions": [
        {"title": "Действие 1", "budget": "$XK", "detail": "детали"},
        {"title": "Действие 2", "budget": "$XK", "detail": "детали"},
        {"title": "Действие 3", "budget": "$XK", "detail": "детали"}
      ],
      "metrics": "метрики результата"
    },
    "finance": {
      "totalInvest": "$XXXK",
      "arr": "$X.XM",
      "payback": "X-X месяцев",
      "roi": "XXXX%",
      "q1invest": "$XXK",
      "q2invest": "$XXK",
      "q3invest": "$XXK",
      "q4invest": "$XXK",
      "q1revenue": "$XXXK",
      "q2revenue": "$XXXK",
      "q3revenue": "$XXXK",
      "q4revenue": "$XXXK",
      "ltvCac": "Xx",
      "grossMargin": "XX%"
    },
    "criticalRec": "Самое важное действие для ${product} прямо сейчас",
    "importantRec": "Второе по важности действие"
  }
}`;

    const requestData = JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Ты эксперт по конкурентному анализу. Отвечай ТОЛЬКО валидным JSON без markdown блоков. Используй реальные данные о компаниях из указанной сферы.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
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
              const content = parsed.choices[0].message.content;
              const analysis = JSON.parse(content);
              resolve({
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify(analysis)
              });
            } else {
              resolve({
                statusCode: 500,
                body: JSON.stringify({ error: 'Invalid OpenAI response', raw: data.substring(0, 200) })
              });
            }
          } catch (e) {
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'Parse error: ' + e.message })
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ statusCode: 500, body: JSON.stringify({ error: error.message }) });
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
