const https = require('https');

// Jina Reader — scrapes any URL and returns clean text, free, no API key
function fetchJina(url) {
  return new Promise((resolve) => {
    try {
      const clean = url.trim().replace(/^https?:\/\//, '');
      const req = https.request({
        hostname: 'r.jina.ai', path: '/' + clean, method: 'GET',
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text', 'User-Agent': 'Mozilla/5.0' }
      }, (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => resolve(raw.substring(0, 1500)));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(9000, () => { req.destroy(); resolve(''); });
      req.end();
    } catch(e) { resolve(''); }
  });
}

async function scrapeCompetitorUrls(urls) {
  if (!urls || !urls.length) return '';
  const valid = urls.filter(u => u && u.startsWith('http')).slice(0, 3);
  if (!valid.length) return '';
  const results = await Promise.all(valid.map(async (url) => {
    const text = await fetchJina(url);
    return text ? `--- ${url} ---\n${text}` : '';
  }));
  const combined = results.filter(Boolean).join('\n\n');
  return combined ? `\n\nРЕАЛЬНЫЕ ДАННЫЕ С САЙТОВ КОНКУРЕНТОВ (используй их в анализе):\n${combined}` : '';
}

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

const TAB_SCHEMAS = {
  market: `{"market":{"headers":["Компания","Доля рынка","Рост/год","Позиция","Тренд"],"rows":[["Н1","X%","X%","Лидер","↑"],["Н2","X%","X%","Претендент","→"],["Н3","X%","X%","Быстрорастущий","↑"],["Н4","X%","X%","Зрелый","↓"],["Н5","X%","X%","Нишевый","→"]],"summary":["конкретный вывод1","конкретный вывод2","конкретный вывод3"],"bestCompany":"Н","bestAdvice":"конкретный совет что делать с учётом анализа"},"competitors":["Н1","Н2","Н3","Н4","Н5"]}`,
  audience: `{"audience":{"headers":["Компания","Сегмент","Роли","Боль","Зрелость"],"rows":[["Н1","сег","роли","боль","ур"],["Н2","сег","роли","боль","ур"],["Н3","сег","роли","боль","ур"],["Н4","сег","роли","боль","ур"],["Н5","сег","роли","боль","ур"]],"summary":["в1","в2","в3"],"bestCompany":"Н","bestAdvice":"совет"}}`,
  pricing: `{"pricing":{"headers":["Компания","Модель","Цена","Бесплатно","Пробный период","Скидки"],"rows":[["Н1","За пользователя","$X/мес","✅","14д","есть"],["Н2","За пользователя","$X/мес","❌","7д","нет"],["Н3","Бесплатный план","$X/мес","✅","30д","есть"],["Н4","За пользователя","$X/мес","❌","—","нет"],["Н5","Бесплатный план","$X/мес","✅","14д","есть"]],"summary":["в1","в2","в3"],"bestCompany":"Н","bestAdvice":"совет"}}`,
  channels: `{"channels":{"headers":["Компания","Модель роста","Поиск","Реклама","Соцсети","Email"],"rows":[["Н1","Через продукт","40%","30%","20%","10%"],["Н2","Через продажи","30%","40%","20%","10%"],["Н3","Через маркетинг","50%","20%","20%","10%"],["Н4","Продукт+Маркетинг","35%","35%","20%","10%"],["Н5","Через продажи","25%","45%","20%","10%"]],"summary":["в1","в2","в3"],"bestCompany":"Н","bestAdvice":"совет"}}`,
  product: `{"product":{"headers":["Компания","Функции","AI","Интеграции","Мобайл","Барьер"],"rows":[["Н1","функции","✅","100+","✅","🟢 Высокий"],["Н2","функции","❌","50+","✅","🟡 Средний"],["Н3","функции","✅","200+","❌","🔴 Низкий"],["Н4","функции","⚠️","80+","✅","🟢 Высокий"],["Н5","функции","✅","150+","❌","🟡 Средний"]],"summary":["в1","в2","в3"],"bestCompany":"Н","bestAdvice":"совет"}}`,
  reputation: `{"reputation":{"headers":["Компания","Рейтинг G2","Отзывов","Жалобы","Поддержка","PR"],"rows":[["Н1","4.5/5","5K","жалоба","4.3/5","🟢"],["Н2","4.2/5","3K","жалоба","4.0/5","🟡"],["Н3","4.7/5","8K","жалоба","4.5/5","🟢"],["Н4","3.9/5","2K","жалоба","3.8/5","🔴"],["Н5","4.4/5","6K","жалоба","4.2/5","🟡"]],"summary":["в1","в2","в3"],"bestCompany":"Н","bestAdvice":"совет"}}`,
  offers: `{"offers":{"headers":["Компания","Лид-магнит","Оффер","Лояльность","Ответ"],"rows":[["Н1","оффер","скидка","программа","2ч"],["Н2","оффер","скидка","программа","4ч"],["Н3","оффер","скидка","программа","1ч"],["Н4","оффер","скидка","программа","8ч"],["Н5","оффер","скидка","программа","3ч"]],"summary":["в1","в2","в3"],"bestCompany":"Н","bestAdvice":"совет"}}`,
  strategy: `{"strategy":{"q1":{"goal":"цель","actions":[{"title":"действие","budget":"$XK","detail":"детали"},{"title":"действие","budget":"$XK","detail":"детали"}],"metrics":"метрики"},"q2":{"goal":"цель","actions":[{"title":"действие","budget":"$XK","detail":"детали"},{"title":"действие","budget":"$XK","detail":"детали"}],"metrics":"метрики"},"q3":{"goal":"цель","actions":[{"title":"действие","budget":"$XK","detail":"детали"},{"title":"действие","budget":"$XK","detail":"детали"}],"metrics":"метрики"},"q4":{"goal":"цель","actions":[{"title":"действие","budget":"$XK","detail":"детали"},{"title":"действие","budget":"$XK","detail":"детали"}],"metrics":"метрики"},"finance":{"totalInvest":"$XK","arr":"$XM","payback":"X мес","roi":"X%"},"criticalRec":"главное","importantRec":"второе"}}`,
  swot: `{"swot":{"strengths":["сильная сторона 1","сильная сторона 2","сильная сторона 3","сильная сторона 4"],"weaknesses":["слабость 1","слабость 2","слабость 3","слабость 4"],"opportunities":["возможность 1","возможность 2","возможность 3","возможность 4"],"threats":["угроза 1","угроза 2","угроза 3","угроза 4"]}}`,
  positioning: `{"positioning":{"xLabel":"Простота","xLabelEnd":"Сложность","yLabel":"Малый бизнес","yLabelEnd":"Крупный бизнес","competitors":[{"name":"Н1","x":50,"y":60,"color":"#60a5fa"},{"name":"Н2","x":70,"y":75,"color":"#a78bfa"},{"name":"Н3","x":35,"y":30,"color":"#34d399"},{"name":"Н4","x":20,"y":25,"color":"#f87171"},{"name":"Н5","x":80,"y":55,"color":"#fbbf24"},{"name":"НашПродукт","x":40,"y":35,"color":"#d4a843","isClient":true}],"insight":"Текст инсайта: какая ниша свободна и почему это точка входа"}}`,
  quickwins: `{"quickwins":[{"day":"День 1–2","title":"Название действия","action":"Конкретное описание что делать","effort":"Низкие","impact":"Высокий","why":"Почему это сработает"},{"day":"День 3–4","title":"Название действия","action":"Конкретное описание что делать","effort":"Низкие","impact":"Высокий","why":"Почему это сработает"},{"day":"День 5–7","title":"Название действия","action":"Конкретное описание что делать","effort":"Средние","impact":"Очень высокий","why":"Почему это сработает"}]}`,
  gaps: `{"gaps":[{"emoji":"💰","title":"Название пробела рынка","description":"Детальное описание пробела: что не делают конкуренты и почему это проблема","opportunity":"🔥 Очень высокая","who":"Целевой сегмент"},{"emoji":"🤖","title":"Название пробела рынка","description":"Детальное описание пробела с конкретными данными","opportunity":"🔥 Очень высокая","who":"Целевой сегмент"},{"emoji":"🌍","title":"Название пробела рынка","description":"Детальное описание пробела","opportunity":"⚡ Высокая","who":"Целевой сегмент"},{"emoji":"🎯","title":"Название пробела рынка","description":"Детальное описание пробела","opportunity":"⚡ Высокая","who":"Целевой сегмент"}]}`
};

async function fetchTab(tab, area, segment, product, description, geo, competitors, price, apiKey, urls) {
  const compLine = competitors && competitors.length
    ? `Конкуренты: ${competitors.join(', ')}\n`
    : '';

  const scrapedContext = await scrapeCompetitorUrls(urls);

  const quickwinsExtra = tab === 'quickwins' ? `
ВАЖНО для quickwins: давай только конкретные действия которые основатель делает сам за 1-2 дня.
НЕ ДАВАЙ задачи на исследование: "изучить рынок", "провести анализ", "использовать SimilarWeb" — анализ уже сделан.
ДАВАЙ готовые шаги: создать страницу, написать письма конкретным людям, запустить оффер, опубликовать пост.
Поле "action": простым языком как другу — что именно открыть, написать, запустить. Пример: "Создай страницу /vs/[конкурент] с честной таблицей сравнения по цене и функциям — люди которые ищут замену [конкуренту] сами на неё придут".
Поле "why": одна конкретная цифра или факт почему это работает именно для этого продукта и ниши.` : '';

  const strategyExtra = tab === 'strategy' ? `
ВАЖНО для strategy: давай конкретные действия, не абстрактные ("улучшение продукта", "агрессивный маркетинг" — не подходят).
Поле "goal" каждого квартала — измеримая цель с числом (например "50 платящих клиентов", "выручка $10K/мес").
Поле "detail" каждого действия — конкретно что делать: какую страницу создать, кому написать, что запустить.
Поле "criticalRec" — одно самое важное действие прямо сейчас, конкретное и срочное.
Поле "importantRec" — второй по важности шаг.` : '';

  const prompt = `Продукт: ${product} | Сфера: ${area} | Сегмент: ${segment} | География: ${geo} | Цена: ${price}
Описание: ${description}
${compLine}Заполни JSON реальными данными для раздела "${tab}". Максимум 5 слов в ячейке.
ВАЖНО: Замени все плейсхолдеры (Н1, Н2, Н3, Н4, Н5, НашПродукт) на реальные названия известных компаний-конкурентов в этой сфере. НашПродукт замени на "${product}". Используй только реальные названия компаний, не "Конкурент 1" и не другие заглушки.${quickwinsExtra}${strategyExtra}${scrapedContext}
Шаблон: ${TAB_SCHEMAS[tab]}`;

  const maxTokens = scrapedContext ? 1100 : 700;

  const isAnthropic = apiKey.startsWith('sk-ant-');

  if (isAnthropic) {
    // Anthropic Claude API
    const resp = await httpPost('api.anthropic.com', '/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system: 'Верни ТОЛЬКО валидный JSON без markdown. Заполни реальными данными.',
        messages: [{ role: 'user', content: prompt }]
      }
    );
    if (resp.error) throw new Error('Anthropic: ' + (resp.error.message || JSON.stringify(resp.error)));
    if (!resp.content || !resp.content[0]) throw new Error('Anthropic вернул пустой ответ: ' + JSON.stringify(resp).substring(0, 200));
    return JSON.parse(resp.content[0].text);
  } else {
    // OpenAI API
    const resp = await httpPost('api.openai.com', '/v1/chat/completions',
      { 'Authorization': `Bearer ${apiKey}` },
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Верни ТОЛЬКО валидный JSON без markdown. Заполни реальными данными.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      }
    );
    if (resp.error) throw new Error('OpenAI: ' + resp.error.message);
    if (!resp.choices || !resp.choices[0]) throw new Error('OpenAI вернул пустой ответ: ' + JSON.stringify(resp).substring(0, 200));
    return JSON.parse(resp.choices[0].message.content);
  }
}

// Vercel serverless function format
module.exports = async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  try {
    if (!req.body) {
      res.status(400).json({ error: 'Пустой запрос — тело не получено' });
      return;
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { area, segment, product, description, geography, competitors, competitorUrls, price, tab, competitorNames, apiKey: clientKey } = body;
    const apiKey = (clientKey && (clientKey.startsWith('sk-ant-') || clientKey.startsWith('sk-')) && clientKey.length > 20)
      ? clientKey
      : process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'Нет ключа OpenAI. Вставь свой ключ в поле вверху страницы.' });
      return;
    }

    const geo = Array.isArray(geography) ? geography.join(', ') : (geography || 'глобально');
    const targetTab = tab || 'market';
    const knownCompetitors = competitorNames || (competitors ? [competitors] : []);
    const urlList = Array.isArray(competitorUrls)
      ? competitorUrls
      : (typeof competitorUrls === 'string' ? competitorUrls.split(/[\n,]+/).map(u => u.trim()).filter(Boolean) : []);

    const data = await fetchTab(targetTab, area, segment, product, description, geo, knownCompetitors, price, apiKey, urlList);
    res.status(200).json(data);

  } catch (error) {
    console.error('analyze error:', error.message, error.stack);
    res.status(500).json({ error: error.message, stack: error.stack ? error.stack.split('\n')[0] : '' });
  }
};
