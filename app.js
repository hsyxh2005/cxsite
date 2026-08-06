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

// ===== 进度条 =====
function startProgress() {
  const bar = document.getElementById('progress-bar');
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
  // 立即执行路由处理，避免依赖 hashchange 事件延迟
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#home';
  const parts = hash.split('/');
  const route = parts[0].replace('#', '');
  const subIndex = parts[1];

  // 1. 隐藏所有 section（同时移除 active-section 类）
  document.querySelectorAll('.section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active-section');
  });
  // 2. 隐藏详情视图
  const detailView = document.getElementById('detail-view');
  detailView.classList.add('hidden');

  // 3. 更新导航激活
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${route}`);
  });

  // 4. 判断路由
  if ((route === 'article' || route === 'essay') && subIndex !== undefined) {
    showDetail(route === 'article' ? 'articles' : 'essays', parseInt(subIndex));
  } else {
    const section = document.getElementById(`section-${route}`);
    if (section) {
      section.classList.remove('hidden');
      section.classList.add('active-section');
      // 触发滚动动画
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
  const items = type === 'articles' ? allData.articles : allData.essays;
  const item = items[index];
  if (!item) return;

  const detailView = document.getElementById('detail-view');
  const detailContent = document.getElementById('detail-content');
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
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
  let saved = localStorage.getItem('themeMode');
  if (!saved) saved = 'auto';
  applyTheme(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = localStorage.getItem('themeMode') || 'auto';
    let next;
    if (current === 'auto') {
      const curTheme = document.documentElement.dataset.theme;
      next = curTheme === 'dark' ? 'light' : 'dark';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'light';
    }
    localStorage.setItem('themeMode', next);
    applyTheme(next);
  });

  setInterval(() => {
    const mode = localStorage.getItem('themeMode') || 'auto';
    if (mode === 'auto') applyTheme('auto');
  }, 60000);
}

// ===== 主程序 =====
async function loadData() {
  startProgress();
  try {
    const [home, projects, articles, essays, about] = await Promise.all([
      fetch('data/home.json').then(r => r.json()),
      fetch('data/projects.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
      fetch('data/essays.json').then(r => r.json()),
      fetch('data/about.json').then(r => r.json()),
    ]);

    allData = { home, projects, articles, essays, about };

    // 填充首页
    document.getElementById('hero-name').textContent = home.name;
    document.getElementById('hero-title').textContent = home.title;
    document.getElementById('hero-intro').textContent = home.intro;
    document.getElementById('nav-brand').textContent = home.name;

    // 渲染各板块
    renderSection('projects-container', projects, 'project');
    renderSection('articles-container', articles, 'article');
    renderSection('essays-container', essays, 'essay');

    // 关于
    const aboutContainer = document.getElementById('about-container');
    aboutContainer.innerHTML = `
      <p class="about-bio">${about.bio}</p>
      <div class="about-skills">
        ${about.skills.map(s => `<span class="about-skill">${s}</span>`).join('')}
      </div>
      <div class="about-links">
        ${about.links.map(l => `<a href="${l.url}" target="_blank">${l.label}</a>`).join('')}
      </div>
    `;

    // 构建搜索索引
    searchableItems = [
      ...projects.map((p, i) => ({ type: 'projects', typeLabel: '开发', title: p.name, content: p.desc, index: i })),
      ...articles.map((a, i) => ({ type: 'articles', typeLabel: '文章', title: a.title, content: a.content, index: i })),
      ...essays.map((e, i) => ({ type: 'essays', typeLabel: '随笔', title: e.title, content: e.content, index: i })),
    ];

    // 动态年份
    document.getElementById('year').textContent = new Date().getFullYear();

    // 先执行路由处理，再隐藏 loading（确保内容可见）
    handleRoute();
    // 隐藏 loading 遮罩
    document.getElementById('loading-overlay').classList.add('hidden');

    // 监听 hash 变化
    window.addEventListener('hashchange', handleRoute);

    // 搜索输入
    const searchInput = document.getElementById('search-input');
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(searchInput.value), 300);
    });

    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-results') && !e.target.closest('#search-input')) {
        document.getElementById('search-results').classList.add('hidden');
      }
    });

  } catch (err) {
    console.error('数据加载失败', err);
    document.getElementById('loading-overlay').classList.add('hidden');
    document.body.innerHTML += '<p style="color:red; text-align:center;margin-top:40px;">内容加载失败，请刷新重试</p>';
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