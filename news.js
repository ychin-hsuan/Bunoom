const newsButton = document.querySelector('#news-load');
const newsStatus = document.querySelector('#news-status');
const newsGrid = document.querySelector('#news-grid');
let currentArticles = [];

const DEMO_NEWS = [
  {
    source: 'Bunoom sample',
    title: 'Why city trees can improve local climate',
    description: 'Researchers are studying how trees can provide shade, lower nearby temperatures, and support healthier urban spaces.',
    url: 'https://example.com/bunoom-sample'
  }
];

function escapeNewsText(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function cleanPassageText(value, fallback) {
  const text = String(value || fallback || '').replace(/<[^>]*>/g, '').trim();
  return text.replace(/[&<>]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  }[character]));
}

function renderNews(articles) {
  currentArticles = articles;
  newsGrid.innerHTML = articles.map((article) => {
    const date = article.publishedAt
      ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
    return `<article class="news-card"><span class="news-source">${escapeNewsText(article.source)}${date ? ` · ${date}` : ''}</span><h3>${escapeNewsText(article.title)}</h3><p>${escapeNewsText(article.description)}</p><a href="${escapeNewsText(article.url)}" target="_blank" rel="noopener noreferrer">Read original source ↗</a></article>`;
  }).join('');
}

/*
 * This is intentionally local. It turns a headline into a short, safe
 * practice set without calling Claude/Gemini on every click. The generated
 * object uses the exact same shape as the built-in passages in app.js, so it
 * can use the existing reader, audio, vocabulary popovers, and quiz screens.
 */
function createLocalPractice(article) {
  const title = cleanPassageText(article.title, 'A recent scientific report');
  const description = cleanPassageText(
    article.description,
    'The report describes a change that researchers are examining more closely.'
  );
  const source = cleanPassageText(article.source, 'a news source');

  return {
    id: `news-${Date.now()}`,
    topic: 'NEWS & IDEAS',
    title: title.length > 72 ? `${title.slice(0, 69)}…` : title,
    subtitle: 'A TOEFL-style reading adapted from a recent news report.',
    level: 'B2',
    minutes: 8,
    category: 'news',
    paragraphs: [
      `A recent report titled “${title}” has drawn attention because it connects a current event with a larger question. The report, published by ${source}, explains that ${description} Rather than presenting the event as an isolated fact, the article considers the conditions that produced it and the reasons it may matter beyond the original location.`,
      `For researchers, one report is useful but cannot answer every question. They compare observations from different places and times, look for a repeated pattern, and consider whether other explanations are possible. This process helps separate a short-term change from a broader trend. It also reminds readers that early reports may be revised when new evidence becomes available.`,
      `The example illustrates why news about science and society often requires careful reading. A headline gives readers a starting point, while the details provide context. By examining the evidence, its limits, and the possible effects on people or the environment, readers can form a more balanced understanding of the issue.`
    ],
    translations: [
      '最近一篇報導引起了注意，因為它把當前事件與更大的問題連結起來。',
      '對研究人員來說，一份報告很有用，但無法回答所有問題。',
      '這個例子說明，閱讀科學與社會新聞時，通常需要仔細理解。'
    ],
    words: {
      conditions: ['noun', 'the situations that affect what happens', 'Weather conditions can change a plan.'],
      pattern: ['noun', 'a repeated or regular way in which something happens', 'Scientists noticed a pattern in the data.'],
      evidence: ['noun', 'facts or information that show whether an idea is true', 'The team collected evidence before reaching a conclusion.'],
      revised: ['adjective', 'changed because of new information', 'The researchers published a revised report.']
    },
    questions: [
      {
        q: 'What is the passage mainly about?',
        options: [
          'Why headlines should always be ignored',
          'How readers can understand a news report by considering context and evidence',
          'Why researchers only study events in one location',
          'How to write a newspaper headline'
        ],
        answer: 1,
        why: 'The passage explains how context, comparisons, evidence, and limits help readers understand a current report.'
      },
      {
        q: 'Why do researchers compare observations from different places and times?',
        options: [
          'To make a headline shorter',
          'To avoid collecting any new evidence',
          'To see whether a repeated pattern is a broader trend',
          'To prove that every early report is wrong'
        ],
        answer: 2,
        why: 'The second paragraph says comparisons help researchers identify repeated patterns and distinguish short-term changes from broader trends.'
      },
      {
        q: 'The word “revised” in paragraph 2 is closest in meaning to…',
        options: [
          'changed after new information',
          'printed for the first time',
          'hidden from readers',
          'written without evidence'
        ],
        answer: 0,
        why: 'A report is revised when it is changed or updated because new evidence becomes available.'
      }
    ]
  };
}

function generatePractice(article, button) {
  if (!article || !Array.isArray(daily) || daily.length !== 3) {
    newsStatus.textContent = 'The daily practice list is not ready yet. Please refresh once.';
    return;
  }

  const doneToday = getDaily();
  const slot = daily.findIndex((passage) => !doneToday.includes(passage.id));
  if (slot === -1) {
    newsStatus.textContent = 'You have already completed today’s three passages.';
    document.querySelector('#practice')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  button.disabled = true;
  button.textContent = 'Opening practice…';
  const practice = createLocalPractice(article);
  daily[slot] = practice;
  passageIndex = slot;
  newsStatus.textContent = 'Practice ready — no AI credits were used.';
  button.disabled = false;
  button.innerHTML = 'Make TOEFL practice <span>→</span>';
  renderHome();
  openReader();
}

async function loadNews() {
  if (!cloudClient) {
    renderNews(DEMO_NEWS);
    newsStatus.textContent = 'Preview headline loaded. Open the original source to read more.';
    return;
  }

  const { data: { session } } = await cloudClient.auth.getSession();
  if (!session) {
    renderNews(DEMO_NEWS);
    newsStatus.textContent = 'Preview headline loaded. Sign in later to use live GNews headlines.';
    return;
  }

  newsButton.disabled = true;
  newsStatus.textContent = 'Loading today’s headlines…';
  const { data, error } = await cloudClient.functions.invoke('news', { body: { category: 'science' } });
  newsButton.disabled = false;

  if (error || !data?.articles) {
    newsStatus.textContent = 'News is temporarily unavailable. Please try again later.';
    return;
  }

  renderNews(data.articles);
  newsStatus.textContent = data.articles.length
    ? 'Fresh headlines from GNews. Open an original source to read the full story.'
    : 'No headlines were found right now.';
}

newsButton?.addEventListener('click', loadNews);
