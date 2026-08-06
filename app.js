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

function getExcerpt(content, len = 70) {
  const plain = content.replace(/[*\n`>]/g, '').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

function renderCards(containerId, items, type = 'project') {
  const container = document.getElementById(containerId);
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
        <div class="${type}-full">${parseMarkdown(item.content)}</div>
      `;
      el.addEventListener('click', () => el.classList.toggle('expanded'));
    }
    el.style.transitionDelay = `${i * 0.04}s`;
    container.appendChild(el);
  });
}

// ===== 深色模式管理 =====
function applyTheme(mode) {
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  let theme;
  if (mode === 'light') theme = 'light';
  else if (mode === 'dark') theme = 'dark';
  else theme = isNight ? 'dark' : 'light'; // auto

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
      // 手动切换：若当前为暗则切亮，反则切暗
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

  // 每分钟检查一次自动切换（若模式为 auto）
  setInterval(() => {
    const mode = localStorage.getItem('themeMode') || 'auto';
    if (mode === 'auto') applyTheme('auto');
  }, 60000);
}

// ===== 主程序 =====
async function loadData() {
  try {
    const [home, projects, articles, essays, about] = await Promise.all([
      fetch('/data/home.json').then(r => r.json()),
      fetch('/data/projects.json').then(r => r.json()),
      fetch('/data/articles.json').then(r => r.json()),
      fetch('/data/essays.json').then(r => r.json()),
      fetch('/data/about.json').then(r => r.json()),
    ]);

    // 填充首页
    document.getElementById('hero-name').textContent = home.name;
    document.getElementById('hero-title').textContent = home.title;
    document.getElementById('hero-intro').textContent = home.intro;
    document.getElementById('nav-brand').textContent = home.name;

    // 作品
    renderCards('projects-container', projects, 'project');

    // 文章
    renderCards('articles-container', articles, 'article');

    // 随笔
    renderCards('essays-container', essays, 'essay');

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

    // 动态年份
    document.getElementById('year').textContent = new Date().getFullYear();

    // 滚动淡入观察器
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  } catch (err) {
    console.error('数据加载失败', err);
    document.body.innerHTML += '<p style="color:red; text-align:center;">内容加载失败，请刷新重试</p>';
  }
}

// ===== 启动 =====
initTheme();
loadData();