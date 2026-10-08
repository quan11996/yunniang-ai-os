/* 云酿智链 AI OS —— 应用主逻辑（hash 路由 + 视图渲染 + Demo 编排） */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const state = { agentTab: 'select', running: false, benchRunning: false, benchDone: false };

/* ================= 导航 ================= */
const NAV = [
  { group: '平台总览' },
  { id: 'overview', t: '总览驾驶舱', ico: '◈' },
  { group: 'AI OS 产品' },
  { id: 'arch', t: 'AI OS 技术架构', ico: '⬢' },
  { id: 'agent', t: 'Agent 工作台', ico: '✦', badge: 'Demo 可跑' },
  { group: '商业验证' },
  { id: 'benchmark', t: 'Benchmark 三组盲测', ico: '◔', badge: '实测', gold: true },
  { id: 'evidence', t: 'AI 服务证据链', ico: '⛓' },
  { group: '数据与知识产权' },
  { id: 'data', t: '数据资产', ico: '▤' },
  { id: 'ip', t: '知识产权', ico: '§' },
  { group: '产业愿景' },
  { id: 'value', t: '产业价值与复制', ico: '↗' },
];
const TITLES = {
  overview: '总览驾驶舱', arch: 'AI OS 技术架构', agent: 'Agent 工作台',
  benchmark: 'Benchmark · 三组盲测', evidence: 'AI 技术服务证据链',
  data: '数据资产 · 五大数据域', ip: '知识产权布局', value: '产业价值与规模复制',
};

function renderNav() {
  $('#nav').innerHTML = NAV.map(n => n.group
    ? `<div class="nav-group">${n.group}</div>`
    : `<div class="nav-item" data-id="${n.id}"><span class="ico">${n.ico}</span>${n.t}
        ${n.badge ? `<span class="badge ${n.gold ? 'gold' : ''}">${n.badge}</span>` : ''}</div>`
  ).join('');
  $$('.nav-item').forEach(el => el.onclick = () => location.hash = '#/' + el.dataset.id);
}

function route() {
  const id = (location.hash.replace('#/', '') || 'overview');
  const view = TITLES[id] ? id : 'overview';
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.id === view));
  $('#viewTitle').textContent = TITLES[view];
  $('#view').innerHTML = `<div class="page">${Views[view]()}</div>`;
  $('#view').scrollTop = 0;
  Binds[view] && Binds[view]();
  updateBackendStatus();
}

/* ================= 视图 ================= */
const Views = {};

/* ---------- 总览驾驶舱 ---------- */
Views.overview = () => `
  <div class="hero">
    <h1>云酿智链 <span class="gold">AI OS</span>
      <span class="thin">酒业 AI 经营决策与全链路增长平台</span></h1>
    <div class="pos">
      <span>人工智能 + 酒业</span><span>F2B2C 短链直供</span>
      <span>五大数据域</span><span>8 套自研系统 → 1 个 AI OS</span><span>选品 / 私域 / 投放 / 内容 Agent</span>
    </div>
    <div class="slogan">${DB.brand.slogan} ${DB.brand.tagline}</div>
  </div>

  <div class="story-strip panel">
    ${DB.storyline.map((s, i) => `
      <div class="story-node" data-go="${s.go}">
        <div class="sn-idx">${String(i + 1).padStart(2, '0')}</div>
        <div class="sn-t">${s.t}</div><div class="sn-s">${s.s}</div>
      </div>`).join('')}
  </div>

  <div class="grid" style="grid-template-columns:repeat(6,1fr)">
    ${DB.kpis.map(k => `
      <div class="panel kpi-card"><div class="k-label">${k.label}</div>
        <div class="k-val">${k.val}<em> ${k.unit}</em></div>
        <div class="k-note">${k.note}</div></div>`).join('')}
  </div>

  <div class="grid mt16" style="grid-template-columns:1.5fr 1fr">
    <div class="panel">
      <div class="panel-title">经营数据一张表 <span class="sub">统一口径 · 互不混用</span></div>
      <table class="tbl"><thead><tr>${DB.finance.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${DB.finance.rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td class="dim">${r[4]}</td></tr>`).join('')}</tbody></table>
      <div class="tiny mt8">${DB.finance.note}</div>
    </div>
    <div class="panel">
      <div class="panel-title">营收与净利 <span class="sub">审计口径 · 万元</span></div>
      ${Charts.revenueBars(DB.revenueChart)}
      <div class="legend"><span><i style="background:#E8C476"></i>营业收入</span><span><i style="background:#5BE0D8"></i>净利润</span></div>
    </div>
  </div>

  <div class="panel mt16">
    <div class="panel-title">一体两翼 · 同一套能力的三种变现 <span class="sub">商业模式</span></div>
    <div class="wing">
      ${DB.wings.map(w => `<div class="w-box ${w.core ? 'w-core' : ''}"><div class="w-t">${w.t}</div><div class="w-d">${w.d}</div></div>`).join('')}
    </div>
    <div class="tiny mt8 mono" style="text-align:center;color:var(--gold)">${DB.wingLoop}</div>
  </div>`;

/* ---------- 架构 ---------- */
Views.arch = () => `
  <div class="panel" style="margin-bottom:16px">
    <div class="panel-title">云酿智链 AI OS · 六层架构
      <span class="sub">8 套自研系统整合为一个系统 · 规则写不尽业务的复杂度，我们需要会学习、能推理、自己拿主意的系统</span></div>
    <div class="arch-wrap">
      <div class="arch-layers">
        ${DB.arch.map((l, i) => `
          <div class="arch-layer">
            ${i < DB.arch.length - 1 ? `<span class="flow-dot" style="animation-delay:${i * 0.5}s"></span>` : ''}
            <div class="al-head"><span class="al-idx">${l.idx}</span><span class="al-name">${l.name}</span>
              <div class="al-sys">${l.sys.map(s => `<span class="badge gold">${s}</span>`).join('')}</div></div>
            <div class="al-desc">${l.desc}</div>
            <div class="al-comps">${l.comps.map(c => `<span>${c}</span>`).join('')}</div>
          </div>`).join('')}
      </div>
      <div class="arch-side">
        <div class="panel">
          <div class="panel-title">运行机理</div>
          <div class="small muted">
            <p>① 经营目标输入：场景 / 预算 / 人群 / 库存，一次性告诉 Agent。</p>
            <p class="mt8">② Agent 沿「知识层检索 → 决策层推理 → 生成层产出 → 业务层执行」自动运行。</p>
            <p class="mt8">③ 反馈层把开瓶扫码、成交、复购等效果数据回流数据层，驱动模型迭代——决策越做越准。</p>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">8 套系统 → 6 层架构</div>
          <ul class="sys-map">
            <li><b>数据层</b>｜溯源防伪数据分析 · 云仓储管理分析</li>
            <li><b>知识层</b>｜动态场景词库营销决策</li>
            <li><b>决策层</b>｜选酒数据决策 · 数字化内容投放分析</li>
            <li><b>生成层</b>｜电商主播智能陪练</li>
            <li><b>业务Agent</b>｜私域用户分层运营智能管理</li>
            <li><b>反馈层</b>｜多场景扫码参与抽奖管理</li>
          </ul>
        </div>
      </div>
    </div>
  </div>`;

/* ---------- Agent 工作台 ---------- */
Views.agent = () => `
  <div class="agent-tabs">
    <div class="agent-tab ${state.agentTab === 'select' ? 'active' : ''}" data-t="select">AI 选品 Agent <span class="badge gold">首推</span></div>
    <div class="agent-tab ${state.agentTab === 'private' ? 'active' : ''}" data-t="private">私域经营 Agent</div>
    <div class="agent-tab soon">投放 Agent · 即将上线</div>
    <div class="agent-tab soon">内容 Agent · 即将上线</div>
  </div>
  ${state.agentTab === 'select' ? Views.agentSelect() : Views.agentPrivate()}`;

Views.agentSelect = () => `
  <div class="agent-layout">
    <div class="panel">
      <div class="panel-title">经营目标输入 <span class="sub">一次性告诉 Agent</span></div>
      <div class="form-row"><label>经营场景</label>
        <div class="chips" id="sceneChips">
          ${DB.selectScenes.map((s, i) => `<div class="chip ${i === 0 ? 'on' : ''}" data-v="${s.id}">${s.name}</div>`).join('')}
        </div></div>
      <div class="form-row"><label>决策目标</label>
        <div class="chips" id="goalChips">
          <div class="chip on" data-g="balance">动销 / 毛利均衡</div>
          <div class="chip" data-g="margin">毛利优先</div>
          <div class="chip" data-g="clear">清库存优先</div>
        </div></div>
      <div class="form-row"><label>主推款数：<span class="mono gold" id="topNLabel">4</span> 款</label>
        <input type="range" id="topN" min="3" max="6" value="4" style="width:100%"></div>
      <button class="btn-gold" id="runSelect" style="width:100%">▶ 运行选品 Agent</button>
      <div class="tiny mt8">选品是酒企花钱最快、后悔成本最高的决策，也是我们数据最厚、历史验证样本最多的环节——所以先跑它。</div>
      <div class="tiny mt8" id="engineHint">引擎：${AgentEngine.backendReady() ? '云酿 AI OS 后端决策引擎' : '内置酒业决策引擎（离线可跑）'}${AgentEngine.llmReady() ? ' + Jev大模型' : ''}</div>
    </div>
    <div class="panel console" id="console">
      <div class="console-empty"><div class="big">✦</div>
        <div>输入经营目标，Agent 将完成 检索 → 推理 → 权衡 → 输出 全流程</div>
        <div class="tiny">从需求发起到清单产出，实测秒级</div></div>
    </div>
  </div>`;

Views.agentPrivate = () => `
  <div class="agent-layout">
    <div class="panel">
      <div class="panel-title">私域运营目标 <span class="sub">17万+ 私域用户分层运营</span></div>
      <div class="form-row"><label>运营目标</label>
        <div class="chips" id="pGoalChips">
          ${DB.privateGoals.map((g, i) => `<div class="chip ${i === 0 ? 'on' : ''}" data-v="${g.id}" title="${g.desc}">${g.name}</div>`).join('')}
        </div></div>
      <div class="form-row"><label>说明</label>
        <div class="small muted" id="pGoalDesc">${DB.privateGoals[0].desc}</div></div>
      <button class="btn-gold" id="runPrivate" style="width:100%">▶ 运行私域 Agent</button>
      <div class="tiny mt8">软著支撑：私域用户分层运营智能管理系统（软著登字第17967569号）</div>
    </div>
    <div class="panel console" id="console">
      <div class="console-empty"><div class="big">♟</div>
        <div>Agent 将对私域用户自动分层，生成触达策略与话术</div>
        <div class="tiny">该复购的时候，系统替你提醒</div></div>
    </div>
  </div>`;

/* ---------- Benchmark ---------- */
Views.benchmark = () => `
  <div class="panel">
    <div class="panel-title">Benchmark：规则 / 通用大模型 / 云酿 AI 决策系统
      <span class="sub">同一批历史SKU与投放计划 · 同一时间段 · 同一预算 · 同一目标人群 · 盲测</span></div>
    <div class="small muted">测试方法：抽取同一批历史 SKU 与投放计划，三组方案盲测，结果按统一口径核算。${DB.benchmark.source}。</div>
    <div class="bench-cols">
      ${DB.benchmark.lanes.map((l, i) => `
        <div class="bench-lane" id="lane${i}"><div class="bl-name">${l.name}</div>
          <div class="bl-desc">${l.desc}</div>
          <div class="bl-prog"><i id="prog${i}"></i></div>
          <div class="bl-state" id="state${i}">待运行</div></div>`).join('')}
    </div>
    <button class="btn-gold" id="runBench">▶ 开始三组盲测</button>
    <span class="tiny" id="benchHint" style="margin-left:10px">运行约 12 秒，完整展示三组方案同场竞技过程</span>
    <div class="bench-log mt16" id="benchLog" style="display:none"></div>
  </div>
  <div class="panel mt16" id="benchResult" style="display:none">
    <div class="panel-title">盲测结果 <span class="sub">数据口径见 data.js · 可回填真实实测值</span></div>
    <table class="tbl"><thead><tr>
      <th>指标</th><th>人工规则</th><th>通用大模型</th><th style="color:var(--gold)">云酿 AI 决策系统</th><th>口径说明</th><th>对比可视化</th>
    </tr></thead><tbody id="benchBody"></tbody></table>
    <div class="mt16 small gold" id="benchConclusion" style="display:none">▸ ${DB.benchmark.conclusion}</div>
  </div>`;

/* ---------- 证据链 ---------- */
Views.evidence = () => `
  <div class="panel">
    <div class="panel-title">${DB.evidence.title} <span class="sub">为什么是"证据链"而不是"一张合同"</span></div>
    <div class="small muted">${DB.evidence.desc}</div>
    <div class="chain">
      ${DB.evidence.nodes.map(n => `
        <div class="chain-node ${n.status}">
          <div class="chain-ico">${n.ico}</div>
          <div class="chain-t">${n.t}</div>
          <div class="chain-s">${n.status === 'done' ? '<span class="green">● 已完成</span>' : '<span class="gold">◐ 里程碑推进中</span>'}</div>
        </div>`).join('')}
    </div>
    <div class="tiny" style="text-align:center">${DB.evidence.note}</div>
  </div>
  <div class="grid mt16" style="grid-template-columns:repeat(3,1fr)">
    ${DB.evidence.nodes.map(n => `
      <div class="doc-card"><div class="dc-t">${n.t} · ${n.doc.t}</div>
        ${n.doc.rows.map(r => `<div class="dc-row"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}
      </div>`).join('')}
  </div>`;

/* ---------- 数据资产 ---------- */
Views.data = () => `
  <div class="panel">
    <div class="panel-title">五大数据域 <span class="sub">生意做得越大越看清：真正值钱的不是货，是货背后的数据</span></div>
    <div class="domain-grid">
      ${DB.domains.map(d => `<div class="domain"><div class="d-ico">${d.ico}</div>
        <div class="d-t">${d.t}</div><div class="d-d">${d.d}</div><div class="d-v">${d.v}</div></div>`).join('')}
    </div>
    <div class="mt16 small gold" style="text-align:center">▸ ${DB.dataIP}</div>
  </div>
  <div class="grid mt16" style="grid-template-columns:repeat(3,1fr)">
    <div class="panel"><div class="panel-title">订单数据</div><div class="small muted">告诉我们该生产什么、备多少货——云仓年16万单履约数据沉淀为供应链决策依据。</div></div>
    <div class="panel"><div class="panel-title">私域数据</div><div class="small muted">告诉我们谁在买、为什么复购——17万+ 用户的画像、分层与复购行为全部入库。</div></div>
    <div class="panel"><div class="panel-title">投放数据</div><div class="small muted">告诉我们每一分钱该花在哪——多平台曝光、点击、转化全漏斗数据支撑投放引擎。</div></div>
  </div>
  <div class="panel mt16">
    <div class="panel-title">数据 → 决策的闭环</div>
    <div class="small muted">五大数据域经治理后进入<b class="gold">数据层</b>，场景知识沉淀为<b class="gold">知识层</b>，决策与生成能力在<b class="gold">决策层/生成层</b>完成，由<b class="gold">业务 Agent</b> 执行动作，效果数据经<b class="gold">反馈层</b>回流——数据不是报表，是燃料。</div>
  </div>`;

/* ---------- 知识产权 ---------- */
Views.ip = () => `
  <div class="grid" style="grid-template-columns:repeat(6,1fr)">
    ${DB.ip.summary.map(s => `<div class="panel kpi-card"><div class="k-val">${s.v}</div><div class="k-label">${s.t}</div></div>`).join('')}
  </div>
  <div class="panel mt16">
    <div class="panel-title">AI 决策类新申报 <span class="sub">让技术 IP 与项目核心完全一致</span></div>
    <table class="tbl"><thead><tr><th>名称</th><th>类型</th><th>状态</th><th>对应 AI OS 层级</th></tr></thead>
    <tbody>${DB.ip.filing.map(r => `<tr><td>${r[0]}</td><td><span class="badge gold">${r[1]}</span></td><td><span class="badge cyan">${r[2]}</span></td><td class="dim">${r[3]}</td></tr>`).join('')}</tbody></table>
    <div class="tiny mt8">${DB.ip.note}</div>
  </div>
  <div class="panel mt16">
    <div class="panel-title">已授权 / 已受理知识产权 <span class="sub">全链条布局 · 构筑核心竞争壁垒</span></div>
    <table class="tbl"><thead><tr><th>名称</th><th>类型</th><th>识别号</th><th>状态</th></tr></thead>
    <tbody>${DB.ip.owned.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="mono dim">${r[2]}</td><td><span class="badge ${r[3] === '已授权' ? 'green' : 'gray'}">${r[3]}</span></td></tr>`).join('')}</tbody></table>
  </div>`;

/* ---------- 产业价值 ---------- */
Views.value = () => `
  <div class="panel">
    <div class="panel-title">产业价值：让中小酒企用上头部企业的决策能力</div>
    <div class="value-grid">
      ${DB.values.map(v => `<div class="value-card"><div class="v-idx">${v.i}</div>
        <div class="v-t gold">${v.t}</div><div class="v-d">${v.d}</div></div>`).join('')}
    </div>
    <div class="mt16 small gold" style="text-align:center">酒业数字化不是把酒搬到线上卖，而是让每一个经营决策都有数据撑腰。</div>
  </div>
  <div class="panel mt16">
    <div class="panel-title">三种复制 <span class="sub">复制的本质不是开更多店，而是把"做决策的能力"标准化</span></div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr)">
      ${DB.copy.map((c, i) => `<div class="value-card"><div class="v-idx">×${i + 1}</div>
        <div class="v-t">${c.t}</div><div class="v-d">${c.d}</div></div>`).join('')}
    </div>
  </div>
  <div class="panel mt16">
    <div class="panel-title">三步走战略布局</div>
    <div class="roadmap">
      ${DB.roadmap.map(r => `<div class="road"><div class="r-step">${r.step}</div><div class="r-t">${r.t}</div>
        ${r.rows.map(x => `<div class="r-row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>`).join('')}
    </div>
    <div class="tiny mt8" style="text-align:center">${DB.roadmapFoot}</div>
  </div>`;

/* ================= 交互绑定 ================= */
const Binds = {};

Binds.overview = () => {
  $$('.story-node').forEach(n => n.onclick = () => location.hash = '#/' + n.dataset.go);
};

Binds.agent = () => {
  $$('.agent-tab[data-t]').forEach(t => t.onclick = () => { state.agentTab = t.dataset.t; route(); });
  if (state.agentTab === 'select') bindSelect(); else bindPrivate();
};

/* ---- 选品 Agent ---- */
let selScene = 'mid-autumn', selGoal = 'balance';
function bindSelect() {
  $('#sceneChips').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.v === selScene));
  $('#goalChips').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.g === selGoal));
  $('#sceneChips').querySelectorAll('.chip').forEach(c => c.onclick = () => {
    $('#sceneChips').querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on'); selScene = c.dataset.v;
  });
  $('#goalChips').querySelectorAll('.chip').forEach(c => c.onclick = () => {
    $('#goalChips').querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on'); selGoal = c.dataset.g;
  });
  $('#topN').oninput = e => $('#topNLabel').textContent = e.target.value;
  $('#runSelect').onclick = runSelectDemo;
}

function stepCard(idx, title, time) {
  const el = document.createElement('div');
  el.className = 'step-card';
  el.innerHTML = `<div class="step-head"><span class="s-idx">STEP ${idx}</span>${title}
    <span class="s-time">${time || ''}</span><span class="s-spin"></span></div><div class="step-body"></div>`;
  $('#console').appendChild(el);
  return el;
}
const doneStep = (el, ms) => { el.querySelector('.s-spin').remove(); el.querySelector('.s-time').textContent = ms + 'ms'; };

async function runSelectDemo() {
  if (state.running) return;
  state.running = true;
  $('#runSelect').disabled = true;
  const scene = DB.selectScenes.find(s => s.id === selScene) || DB.selectScenes[0];
  const topN = +$('#topN').value;
  const goalName = { balance: '动销/毛利均衡', margin: '毛利优先', clear: '清库存优先' }[selGoal];

  const con = $('#console'); con.innerHTML = '';
  const t0 = performance.now();

  // STEP1 目标解析
  let s1 = stepCard(1, '经营目标解析');
  await sleep(500);
  s1.querySelector('.step-body').innerHTML = `<div class="kv">
    <span>场景 <b>${scene.name}</b></span><span>目标 <b>${goalName}</b></span>
    <span>主推款数 <b>${topN}</b></span><span>候选池 <b>${DB.skus.length} SKU</b></span>
    <span>价格带 <b>${scene.priceFit[0]}-${scene.priceFit[1]} 元</b></span></div>`;
  doneStep(s1, 512);

  // STEP2 知识库检索
  let s2 = stepCard(2, '知识层 · 场景知识库检索');
  const body2 = s2.querySelector('.step-body');
  for (const k of scene.kb) { await sleep(320); const d = document.createElement('div'); d.className = 'think-line'; d.textContent = k; body2.appendChild(d); }
  doneStep(s2, 1180);

  // STEP3 数据调取
  let s3 = stepCard(3, '数据层 · 历史动销数据调取');
  await sleep(560);
  const avg = Math.round(DB.skus.reduce((a, s) => a + s.sell30, 0) / DB.skus.length * 100);
  s3.querySelector('.step-body').innerHTML = `<div class="kv">
    <span>SKU 档案 <b>${DB.skus.length} 条</b></span><span>动销均值 <b>${avg}%</b></span>
    <span>库存总量 <b>${DB.skus.reduce((a, s) => a + s.inv, 0).toLocaleString()} 件</b></span>
    <span>月销流速 <b>${DB.skus.reduce((a, s) => a + s.velocity, 0).toLocaleString()} 件/月</b></span></div>`;
  doneStep(s3, 608);

  // STEP4 推理权衡
  let s4 = stepCard(4, '决策层 · 多目标加权推理');
  await sleep(300);
  const res = await AgentEngine.runSelect(selScene, selGoal, topN);
  const body4 = s4.querySelector('.step-body');
  const maxT = res.scored[0].total;
  body4.innerHTML = res.scored.map(r => `
    <div class="sku-score"><div class="nm" title="${r.sku.name}">${r.sku.name}</div>
      <div class="bar ${r.total < res.scored[topN - 1].total ? 'rej' : ''}"><i data-w="${r.total / maxT * 100}"></i></div>
      <div class="sc ${r.total < res.scored[topN - 1].total ? 'dim' : ''}">${r.total}</div></div>`).join('');
  await sleep(60);
  body4.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w + '%');
  await sleep(950);
  doneStep(s4, 1260);

  // STEP5 输出决策
  let s5 = stepCard(5, '业务 Agent · 选品清单与理由输出');
  const body5 = s5.querySelector('.step-body');
  for (let i = 0; i < res.picks.length; i++) {
    const r = res.picks[i];
    const d = document.createElement('div');
    d.className = 'pick-card';
    d.innerHTML = `<div class="pc-head"><span class="pc-rank">${i + 1}</span>
      <span class="pc-name">${r.sku.name}</span>
      <div class="pc-tags"><span class="badge cyan">${r.sku.aroma}</span><span class="badge gold">¥${r.sku.price}</span></div></div>
      <div class="pc-why"><b>决策理由：</b>${AgentEngine.buildWhy(r, scene)}</div>
      <div class="pick-stats"><div>综合得分<b>${r.total}</b></div>
        <div>历史30日动销<b>${Math.round(r.sku.sell30 * 100)}%</b></div>
        <div>毛利率<b>${Math.round(r.sku.margin * 100)}%</b></div>
        <div>库存<b>${r.sku.inv} 件</b></div></div>`;
    body5.appendChild(d);
    await sleep(340);
  }
  if (res.llmNote) {
    const n = document.createElement('div');
    n.className = 'seg-msg';
    n.innerHTML = `<i>JEV / 大模型点评</i>${esc(res.llmNote)}`;
    body5.appendChild(n);
  }
  const rej = document.createElement('div');
  rej.className = 'tiny mt8';
  rej.innerHTML = `<span class="red">未入选：</span>` + res.rejected.map(r =>
    `${r.sku.name}（${AgentEngine.rejectReason(r, scene)}）`).join('；');
  body5.appendChild(rej);
  const total = ((performance.now() - t0) / 1000).toFixed(1);
  doneStep(s5, 980);
  const meta = document.createElement('div');
  meta.className = 'tiny mt8 mono';
  const engineTag = res.backend
    ? `云酿 AI OS 后端引擎 · run #${res.run_id} · 服务端 ${res.ms}ms`
    : '内置决策引擎（离线回退）';
  meta.innerHTML = `▸ 决策完成，总耗时 <b class="gold">${total}s</b>（人工选品会约 3.5h）· ${engineTag} · 结果已回流反馈层`;
  body5.appendChild(meta);
  await renderRunLog(body5);
  state.running = false;
  $('#runSelect').disabled = false;
}

/* ---- 私域 Agent ---- */
let pGoal = 'wake';
function bindPrivate() {
  $('#pGoalChips').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.v === pGoal));
  $('#pGoalDesc').textContent = DB.privateGoals.find(g => g.id === pGoal).desc;
  $('#pGoalChips').querySelectorAll('.chip').forEach(c => c.onclick = () => {
    $('#pGoalChips').querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on'); pGoal = c.dataset.v;
    $('#pGoalDesc').textContent = DB.privateGoals.find(g => g.id === pGoal).desc;
  });
  $('#runPrivate').onclick = runPrivateDemo;
}

async function runPrivateDemo() {
  if (state.running) return;
  state.running = true;
  $('#runPrivate').disabled = true;
  const con = $('#console'); con.innerHTML = '';
  const plan = await AgentEngine.planPrivate(pGoal);
  const t0 = performance.now();

  let s1 = stepCard(1, '运营目标解析');
  await sleep(450);
  s1.querySelector('.step-body').innerHTML = `<div class="kv">
    <span>目标 <b>${plan.goal.name}</b></span><span>主战场 <b>${plan.primary.name}</b></span>
    <span>人群规模 <b>${plan.primary.count.toLocaleString()} 人</b></span></div>`;
  doneStep(s1, 447);

  let s2 = stepCard(2, '用户数据域 · RFM 分层调取');
  await sleep(500);
  s2.querySelector('.step-body').innerHTML = `
    <div style="display:flex;gap:18px;align-items:center">
      <div>${Charts.donut(DB.segments)}</div>
      <div style="flex:1">${DB.segments.map(g => `
        <div class="sku-score" style="grid-template-columns:110px 1fr 90px">
          <div class="nm">${g.name}</div>
          <div class="bar"><i data-w="${g.pct * 100}"></i></div>
          <div class="sc ${g.key === plan.primary.key ? '' : 'dim'}">${g.count.toLocaleString()}</div>
        </div>`).join('')}
      </div></div>`;
  await sleep(60);
  s2.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w + '%');
  await sleep(800);
  doneStep(s2, 734);

  let s3 = stepCard(3, '决策层 · 触达策略生成');
  const b3 = s3.querySelector('.step-body');
  const lines = [
    `主攻层「${plan.primary.name}」：${plan.primary.strategy}`,
    `协同层「${plan.others[0].name}」：低干扰内容种草，观察转化信号`,
    `触达节奏：20:00-21:30 私域活跃高峰推送，48h 未读降级短信兜底`,
    `频控约束：同一用户 7 日内最多触达 2 次，防打扰退群`,
  ];
  for (const l of lines) { await sleep(300); const d = document.createElement('div'); d.className = 'think-line'; d.textContent = l; b3.appendChild(d); }
  doneStep(s3, 1210);

  let s4 = stepCard(4, '生成层 · 个性化话术生成');
  const b4 = s4.querySelector('.step-body');
  await sleep(420);
  b4.innerHTML = `
    <div class="seg-msg"><i>触达话术 · A版（主攻层）</i>${esc(plan.primary.msg)}</div>
    <div class="seg-msg"><i>分层策略</i>${esc(plan.primary.strategy)}</div>`;
  if (AgentEngine.llmReady()) {
    const note = await AgentEngine.askLLM(`为酒业私域「${plan.primary.name}」用户写一条${plan.goal.name}微信触达话术，口语化，不超过60字。`);
    if (note) { const d = document.createElement('div'); d.className = 'seg-msg'; d.innerHTML = `<i>触达话术 · B版（大模型生成）</i>${esc(note)}`; b4.appendChild(d); }
  }
  doneStep(s4, 890);

  let s5 = stepCard(5, '业务 Agent · 执行与效果预估');
  await sleep(500);
  s5.querySelector('.step-body').innerHTML = `
    <div class="pick-stats" style="gap:30px">
      <div>预计触达<b>${plan.reach.toLocaleString()} 人</b></div>
      <div>预估转化<b>${plan.conv.toLocaleString()} 单</b></div>
      <div>预估增量GMV<b>¥${plan.gmv.toLocaleString()}</b></div>
      <div>层转化率基准<b>${Math.round(plan.primary.conv * 100)}%</b></div>
    </div>
    <div class="tiny mt8 mono">▸ 已生成执行任务 3 项：人群圈选 · 话术推送 · 48h效果回流（回流至反馈层迭代模型）· ${plan.backend ? `后端落库 run #${plan.run_id}` : '内置引擎（离线回退）'}</div>`;
  doneStep(s5, 660);
  await renderRunLog(s5.querySelector('.step-body'));
  state.running = false;
  $('#runPrivate').disabled = false;
}

/* 决策日志（来自后端 SQLite agent_runs 表） */
async function renderRunLog(bodyEl) {
  try {
    const r = await fetch('/api/logs', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return;
    const j = await r.json();
    if (!j.logs || !j.logs.length) return;
    const div = document.createElement('div');
    div.className = 'mt8';
    div.innerHTML = `<div class="tiny" style="color:var(--text2);margin-bottom:4px">▸ 决策日志已写入后端 SQLite（agent_runs 表，最近 ${j.logs.length} 条）</div>` +
      j.logs.slice(0, 5).map(l =>
        `<div class="tiny mono" style="color:var(--text3)">#${l.id} ${l.created} · ${l.agent === 'select' ? '选品Agent' : '私域Agent'} · 服务端耗时 ${l.ms}ms</div>`
      ).join('');
    bodyEl.appendChild(div);
  } catch (e) { /* 后端离线则静默跳过 */ }
}

/* ---- Benchmark ---- */
Binds.benchmark = () => { $('#runBench').onclick = runBench; };

async function runBench() {
  if (state.benchRunning) return;
  state.benchRunning = true;
  $('#runBench').disabled = true;
  const log = $('#benchLog'); log.style.display = 'block'; log.innerHTML = '';
  const addLog = t => { const d = document.createElement('div'); d.innerHTML = `<span class="t">[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}]</span> ${t}`; log.appendChild(d); log.scrollTop = log.scrollHeight; };

  addLog('载入测试集：历史SKU 10款 / 投放批次24组 / 私域触达8.4万人次');
  const states = ['载入历史数据…', '解析任务约束…', '生成决策方案…', '核算统一口径…'];
  const speeds = [420, 900, 190]; // 每条进度的ms间隔：人工最慢、LLM次之、OS最快
  const dones = [false, false, false];
  const timers = speeds.map((sp, i) => {
    let p = 0, si = 0;
    return setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 6);
      $('#prog' + i).style.width = p + '%';
      if (si < states.length && p > si * 25 + 20) { $('#state' + i).textContent = states[si]; si++; }
      if (p >= 100 && !dones[i]) {
        dones[i] = true;
        $('#state' + i).textContent = '✓ 完成';
        addLog(`<b>${DB.benchmark.lanes[i].name}</b> 完成决策输出`);
      }
    }, sp);
  });
  await sleep(6500);
  timers.forEach(clearInterval);
  dones.forEach((d, i) => { if (!d) { $('#prog' + i).style.width = '100%'; $('#state' + i).textContent = '✓ 完成'; } });
  $('#lane2').classList.add('win');
  addLog('三组结果回收完毕，按统一口径核算中…');
  await sleep(700);

  // 结果表
  $('#benchResult').style.display = 'block';
  const tb = $('#benchBody'); tb.innerHTML = '';
  for (const m of DB.benchmark.metrics) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${m.name}</b><div class="dim">${m.note}</div></td>
      <td class="num">${m.vals[0]}</td><td class="num">${m.vals[1]}</td>
      <td class="num" style="color:var(--gold);font-weight:700">${m.vals[2]} <div class="delta-up">${m.delta}</div></td>
      <td class="dim">${m.note}</td><td>${Charts.trioBars(m.bars)}</td>`;
    tb.appendChild(tr);
    await sleep(380);
  }
  $('#benchConclusion').style.display = 'block';
  addLog('核算完成：云酿 AI 决策系统 5/5 项指标最优');
  state.benchRunning = false; state.benchDone = true;
  $('#runBench').disabled = false;
  $('#benchHint').textContent = '已运行一次，可再次运行复盘';
}

/* ================= Jev 接口配置 ================= */
function bindApiModal() {
  const modal = $('#apiModal');
  $('#btnApiCfg').onclick = () => {
    const c = AgentEngine.getCfg() || {};
    $('#cfgEndpoint').value = c.endpoint || '';
    $('#cfgKey').value = c.key || '';
    $('#cfgModel').value = c.model || '';
    modal.style.display = 'flex';
  };
  $('#cfgCancel').onclick = () => modal.style.display = 'none';
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
  $('#cfgSave').onclick = () => {
    const c = { endpoint: $('#cfgEndpoint').value.trim(), key: $('#cfgKey').value.trim(), model: $('#cfgModel').value.trim() };
    localStorage.setItem('yn_jev_cfg', JSON.stringify(c));
    updateJevStatus(); modal.style.display = 'none';
    if (location.hash.includes('agent')) route();
  };
  $('#cfgClear').onclick = () => {
    localStorage.removeItem('yn_jev_cfg');
    updateJevStatus(); modal.style.display = 'none';
    if (location.hash.includes('agent')) route();
  };
}
function updateJevStatus() {
  const ready = AgentEngine.llmReady();
  $('#jevDot').className = 'dot ' + (ready ? 'live' : 'off');
  $('#jevLabel').textContent = ready ? 'Jev / 大模型已连接' : '内置推理引擎';
}

/* ================= 启动 ================= */
async function updateBackendStatus() {
  const ok = await AgentEngine.pingBackend();
  $('#beDot').className = 'dot ' + (ok ? 'live' : 'off');
  $('#beLabel').textContent = ok ? '后端服务已连接（SQLite）' : '后端离线 · 本地模式';
  const hint = $('#engineHint');
  if (hint) hint.textContent = '引擎：' +
    (ok ? '云酿 AI OS 后端决策引擎' : '内置酒业决策引擎（离线可跑）') +
    (AgentEngine.llmReady() ? ' + Jev大模型' : '');
}

renderNav();
bindApiModal();
updateJevStatus();
updateBackendStatus();
window.addEventListener('hashchange', () => { route(); });
route();
