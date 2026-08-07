// ===== 工具函数 =====
function parseMarkdown(text) {
  return text
    .split('\n\n')
    .map(para => {
      para = para.replace(/`([^`]+)`/g, '<code>$1</code>');
      para = para.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      para = para.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      if (para.startsWith('> ')) {
        return `<blockquote>${para.replace(/^> /, '')}</blockquote>`;
      }
      return `<p>${para}</p>`;
    })
    .join('');
}

function getExcerpt(content, len = 65) {
  const plain = content.replace(/[*\n`>]/g, '').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== 全局数据 =====
let allData = {};
let searchableItems = [];
let progressTimer = null;

// ===== 默认数据（防止 JSON 缺失导致首页空白） =====
const DEFAULT_DATA = {
  home: {
    name: '你的名字',
    title: '会计专业 · 自用软件开发者',
    intro: '欢迎来到我的个人主页！这里是我的自用软件与文章分享空间。',
  },
  projects: [],
  gallery: [],
  articles: [],
  essays: [],
  links: [
    {
      title: 'GitHub',
      url: 'https://github.com/yourname',
      desc: '我的 GitHub 主页'
    }
  ],
  about: {
    bio: '这里填写你的个人简介。',
    skills: ['JavaScript', 'HTML', 'CSS'],
    links: [
      { label: 'GitHub', url: 'https://github.com/yourname' },
      { label: 'Email', url: 'mailto:you@example.com' }
    ],
  }
};

// ===== 数据合并工具 =====
function safeMerge(defaultObj, data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...defaultObj, ...data };
  }
  return defaultObj;
}

function safeArray(data) {
  return Array.isArray(data) ? data : [];
}

// ===== 进度条 =====
function startProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  bar.style.width = '0%';
  bar.classList.add('active');
  requestAnimationFrame(() => {
    bar.style.width = '30%';
  });
  if (progressTimer) clearTimeout(progressTimer);
  progressTimer = setTimeout(() => {
    bar.style.width = '100%';
    setTimeout(() => {
      bar.classList.remove('active');
      bar.style.width = '0%';
    }, 300);
  }, 900);
}

// ===== 路由 =====
function navigate(hash) {
  startProgress();
  window.location.hash = hash;
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#home';
  const parts = hash.split('/');
  const route = parts[0].replace('#', '');
  const subIndex = parts[1];

  // 1. 隐藏所有 section
  document.querySelectorAll('.section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active-section');
  });
  // 2. 隐藏详情视图
  const detailView = document.getElementById('detail-view');
  if (detailView) detailView.classList.add('hidden');

  // 3. 更新导航激活
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${route}`);
  });

  // 4. 判断路由：文章、随笔、图片详情
  if ((route === 'article' || route === 'essay' || route === 'gallery') && subIndex !== undefined) {
    const type = route === 'article' ? 'articles' : route === 'essay' ? 'essays' : 'gallery';
    showDetail(type, parseInt(subIndex));
  } else {
    const section = document.getElementById(`section-${route}`);
    if (section) {
      section.classList.remove('hidden');
      section.classList.add('active-section');

      // 如果是首页，添加 .loaded 避免 hero 动画重播
      if (route === 'home') {
        section.classList.add('loaded');
        // 防止首页简介被意外清空
        const introEl = document.getElementById('hero-intro');
        if (introEl && !introEl.textContent.trim() && allData.home) {
          introEl.textContent = allData.home.intro || DEFAULT_DATA.home.intro;
        }
      }

      // 滚动动画
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      section.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }
  }
}

// ===== 详情 =====
function showDetail(type, index) {
  if (!allData) return;

  const detailView = document.getElementById('detail-view');
  const detailContent = document.getElementById('detail-content');

  if (type === 'gallery') {
    // 项目图片详情
    const items = allData.gallery || [];
    const item = items[index];
    if (!item) return;
    detailContent.innerHTML = `
      <h1>${item.caption || '项目图片'}</h1>
      <img class="gallery-detail-img" src="${item.src}" alt="${item.alt || ''}">
      ${item.caption ? `<p class="gallery-detail-caption">${item.caption}</p>` : ''}
    `;
    detailView.classList.remove('hidden');
    document.getElementById('back-btn').onclick = () => {
      window.history.back();
    };
    return;
  }

  const items = type === 'articles' ? allData.articles : allData.essays;
  if (!items || !items[index]) return;
  const item = items[index];

  detailContent.innerHTML = `
    <h1>${item.title}</h1>
    <div class="meta">${item.date}</div>
    ${parseMarkdown(item.content)}
  `;
  detailView.classList.remove('hidden');
  document.getElementById('back-btn').onclick = () => {
    window.history.back();
  };
}

// ===== 搜索 =====
function performSearch(query) {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;
  if (!query.trim()) {
    resultsContainer.classList.add('hidden');
    return;
  }
  query = query.toLowerCase();
  const results = searchableItems.filter(item =>
    item.title.toLowerCase().includes(query) ||
    (item.content && item.content.toLowerCase().includes(query))
  ).slice(0, 20);

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div style="padding:12px;color:var(--text-secondary);">无结果</div>';
  } else {
    resultsContainer.innerHTML = results.map((r, i) => {
      const highlightedTitle = r.title.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark style="background:var(--accent);color:white;border-radius:4px;padding:0 2px;">$1</mark>');
      const snippet = getExcerpt(r.content, 80);
      const highlightedSnippet = snippet.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark style="background:var(--accent);color:white;border-radius:4px;padding:0 2px;">$1</mark>');
      return `
        <div class="search-result-item" data-type="${r.type}" data-index="${r.index}">
          <div class="search-result-type">${r.typeLabel}</div>
          <div class="search-result-title">${highlightedTitle}</div>
          <div class="search-result-snippet">${highlightedSnippet}</div>
        </div>
      `;
    }).join('');
  }
  resultsContainer.classList.remove('hidden');
}

// ===== 渲染 =====
function renderSection(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item, i) => {
    let el;
    if (type === 'project') {
      el = document.createElement('div');
      el.className = 'card reveal';
      el.innerHTML = `<div class="card-name">${item.name}</div><div class="card-desc">${item.desc}</div>`;
    } else if (type === 'article' || type === 'essay') {
      el = document.createElement('div');
      el.className = type === 'article' ? 'article-card reveal' : 'essay-card reveal';
      el.innerHTML = `
        <div class="${type}-title">${item.title}</div>
        <div class="${type}-date">${item.date}</div>
        <div class="${type}-excerpt">${getExcerpt(item.content)}</div>
      `;
      el.addEventListener('click', () => {
        const route = type === 'article' ? 'article' : 'essay';
        navigate(`#${route}/${i}`);
      });
    }
    el.style.transitionDelay = `${i * 0.04}s`;
    container.appendChild(el);
  });
}

// ===== 渲染图片画廊 =====
function renderGallery(items) {
  const container = document.getElementById('gallery-container');
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'gallery-item reveal';
    const src = item.src || '';
    const alt = item.alt || '项目图片';
    const caption = item.caption || '';
    el.innerHTML = `
      <img src="${src}" alt="${alt}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>'">
      ${caption ? `<div class="caption">${caption}</div>` : ''}
    `;
    // 点击打开图片详情
    el.addEventListener('click', () => {
      navigate(`#gallery/${i}`);
    });
    el.style.transitionDelay = `${i * 0.04}s`;
    container.appendChild(el);
  });
}

function renderLinks(items) {
  const container = document.getElementById('links-container');
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">暂无友链</p>';
    return;
  }
  items.forEach((item, i) => {
    if (!item || !item.url) return;
    const el = document.createElement('a');
    el.className = 'link-card reveal';
    el.href = item.url;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';

    // 头像：优先使用 avatar 字段，否则用标题首字符占位
    const avatarHtml = item.avatar
      ? `<img class="link-avatar" src="${item.avatar}" alt="${item.title}" onerror="this.outerHTML='<div class=&quot;link-avatar-fallback&quot;>${(item.title || '?').charAt(0).toUpperCase()}</div>'">`
      : `<div class="link-avatar-fallback">${(item.title || '?').charAt(0).toUpperCase()}</div>`;

    el.innerHTML = `
      <div class="link-header">
        ${avatarHtml}
        <div class="link-title">${item.title || '未命名'}</div>
      </div>
      ${item.desc ? `<div class="link-desc">${item.desc}</div>` : ''}
      <div class="link-url">${item.url}</div>
    `;
    el.style.transitionDelay = `${i * 0.04}s`;
    container.appendChild(el);
  });
}

// ===== 深色模式 =====
function applyTheme(mode) {
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  let theme;
  if (mode === 'light') theme = 'light';
  else if (mode === 'dark') theme = 'dark';
  else theme = isNight ? 'dark' : 'light';

  document.documentElement.dataset.theme = theme;

  // 同步浏览器地址栏颜色
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#0f0c29' : '#f5f7fa');
  }

  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
  let saved = localStorage.getItem('themeMode');
  if (!saved) saved = 'auto';
  applyTheme(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = localStorage.getItem('themeMode') || 'auto';
    let next;
    if (current === 'auto') next = 'light';
    else if (current === 'light') next = 'dark';
    else next = 'auto';
    localStorage.setItem('themeMode', next);
    applyTheme(next);
  });

  setInterval(() => {
    const mode = localStorage.getItem('themeMode') || 'auto';
    if (mode === 'auto') applyTheme('auto');
  }, 10000);
}

// ===== 主程序 =====
async function loadData() {
  startProgress();
  try {
    // 读取 JSON，顺序：home, projects, images, articles, essays, links, about
    const results = await Promise.allSettled([
      fetch('data/home.json').then(r => r.json()),
      fetch('data/projects.json').then(r => r.json()),
      fetch('data/images.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
      fetch('data/essays.json').then(r => r.json()),
      fetch('data/links.json').then(r => r.json()),
      fetch('data/about.json').then(r => r.json()),
    ]);

    // 用默认值兜底
    const home = safeMerge(DEFAULT_DATA.home, results[0].status === 'fulfilled' ? results[0].value : null);
    const projects = safeArray(results[1].status === 'fulfilled' ? results[1].value : null);
    const gallery = safeArray(results[2].status === 'fulfilled' ? results[2].value : null);
    const articles = safeArray(results[3].status === 'fulfilled' ? results[3].value : null);
    const essays = safeArray(results[4].status === 'fulfilled' ? results[4].value : null);
    const links = safeArray(results[5].status === 'fulfilled' ? results[5].value : null);
    let about = safeMerge(DEFAULT_DATA.about, results[6].status === 'fulfilled' ? results[6].value : null);

    // ===== 自动确保关于页有番茄小说链接 =====
    const fanqieLink = { label: '番茄小说', url: 'https://fanqienovel.com/page/7403708959636327486' };
    if (!about.links) about.links = [];
    if (!about.links.some(l => l.label && l.label.includes('番茄'))) {
      about.links.push(fanqieLink);
    }

    allData = { home, projects, gallery, articles, essays, links, about };

    // 填充首页
    const heroName = document.getElementById('hero-name');
    const heroTitle = document.getElementById('hero-title');
    const heroIntro = document.getElementById('hero-intro');
    const navBrand = document.getElementById('nav-brand');
    if (heroName) heroName.textContent = home.name || DEFAULT_DATA.home.name;
    if (heroTitle) heroTitle.textContent = home.title || DEFAULT_DATA.home.title;
    if (heroIntro) heroIntro.textContent = home.intro || DEFAULT_DATA.home.intro;
    if (navBrand) navBrand.textContent = home.name || DEFAULT_DATA.home.name;

    // 渲染各板块
    renderSection('projects-container', projects, 'project');
    renderGallery(gallery);
    renderSection('articles-container', articles, 'article');
    renderSection('essays-container', essays, 'essay');
    renderLinks(links); // 新增：渲染友链

    // 关于
    const aboutContainer = document.getElementById('about-container');
    if (aboutContainer) {
      aboutContainer.innerHTML = `
        <p class="about-bio">${about.bio}</p>
        <div class="about-skills">
          ${about.skills.map(s => `<span class="about-skill">${s}</span>`).join('')}
        </div>
        <div class="about-links">
          ${about.links.map(l => `<a href="${l.url}" target="_blank">${l.label}</a>`).join('')}
        </div>
      `;
    }

    // 构建搜索索引
    searchableItems = [
      ...projects.map((p, i) => ({ type: 'projects', typeLabel: '开发', title: p.name, content: p.desc, index: i })),
      ...articles.map((a, i) => ({ type: 'articles', typeLabel: '文章', title: a.title, content: a.content, index: i })),
      ...essays.map((e, i) => ({ type: 'essays', typeLabel: '随笔', title: e.title, content: e.content, index: i })),
    ];

    // 动态年份
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 第一次路由处理前，给首页添加 .loaded
    const homeSection = document.getElementById('section-home');
    if (homeSection) homeSection.classList.add('loaded');

    // 先执行路由处理，再隐藏 loading
    handleRoute();
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    // 监听 hash 变化
    window.addEventListener('hashchange', handleRoute);

    // 搜索输入
    const searchInput = document.getElementById('search-input');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(searchInput.value), 300);
      });
    }

    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-results') && !e.target.closest('#search-input')) {
        const results = document.getElementById('search-results');
        if (results) results.classList.add('hidden');
      }
    });

  } catch (err) {
    console.error('数据加载失败', err);
    // 兜底渲染默认数据（同样保证友链和番茄小说存在）
    const fallbackLinks = [
      { title: 'GitHub', url: 'https://github.com', desc: '我的 GitHub' }
    ];
    const fallbackAbout = { ...DEFAULT_DATA.about, links: [ ...DEFAULT_DATA.about.links, { label: '番茄小说', url: 'https://fanqienovel.com' } ] };

    allData = {
      home: DEFAULT_DATA.home,
      projects: DEFAULT_DATA.projects,
      gallery: DEFAULT_DATA.gallery,
      articles: DEFAULT_DATA.articles,
      essays: DEFAULT_DATA.essays,
      links: fallbackLinks,
      about: fallbackAbout,
    };

    document.getElementById('hero-name').textContent = DEFAULT_DATA.home.name;
    document.getElementById('hero-title').textContent = DEFAULT_DATA.home.title;
    document.getElementById('hero-intro').textContent = DEFAULT_DATA.home.intro;
    document.getElementById('nav-brand').textContent = DEFAULT_DATA.home.name;

    renderSection('projects-container', DEFAULT_DATA.projects, 'project');
    renderGallery(DEFAULT_DATA.gallery);
    renderSection('articles-container', DEFAULT_DATA.articles, 'article');
    renderSection('essays-container', DEFAULT_DATA.essays, 'essay');
    renderLinks(fallbackLinks);

    document.getElementById('about-container').innerHTML = `
      <p class="about-bio">${fallbackAbout.bio}</p>
      <div class="about-skills">
        ${fallbackAbout.skills.map(s => `<span class="about-skill">${s}</span>`).join('')}
      </div>
      <div class="about-links">
        ${fallbackAbout.links.map(l => `<a href="${l.url}" target="_blank">${l.label}</a>`).join('')}
      </div>
    `;

    document.getElementById('year').textContent = new Date().getFullYear();

    const homeSection = document.getElementById('section-home');
    if (homeSection) homeSection.classList.add('loaded');

    handleRoute();
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
  }
}

// ===== 搜索点击跳转（事件委托） =====
document.getElementById('search-results').addEventListener('click', (e) => {
  const item = e.target.closest('.search-result-item');
  if (!item) return;
  const type = item.dataset.type;
  const index = item.dataset.index;
  if (type === 'articles' || type === 'essays') {
    navigate(`#${type}/${index}`);
  } else {
    navigate(`#${type}`);
  }
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');
});

// ===== 启动 =====
initTheme();
loadData();
