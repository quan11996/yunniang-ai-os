// ============================================================
// 云酿智链 AI OS —— Deno Deploy 后端（永久免费托管版）
// 零依赖：Deno.serve + Deno KV（决策日志持久化）+ 静态文件服务
// 本地调试：deno run --allow-all --unstable-kv deno/main.ts
// ============================================================

const kv = await Deno.openKv();
const ROOT = new URL('../', import.meta.url);

// ---------------- 种子数据（与 data.js / server/app.py 同源） ----------------
const SKUS = [
  { id: 'SK001', name: '满头彩·鸿运礼盒', aroma: '浓香 52°', price: 368, scenes: ['礼赠','婚宴','节礼'], sell30: 0.71, margin: 0.42, inv: 3200, velocity: 1850, note: '自有品牌礼盒，节庆动销王' },
  { id: 'SK002', name: '金钻清樽', aroma: '清香 42°', price: 188, scenes: ['口粮','微醺','聚饮'], sell30: 0.64, margin: 0.36, inv: 5400, velocity: 2600, note: '自有品牌走量款' },
  { id: 'SK003', name: '蓝钻清樽', aroma: '浓香 45°', price: 268, scenes: ['宴请','礼赠'], sell30: 0.58, margin: 0.40, inv: 2100, velocity: 1200, note: '自有品牌中坚款' },
  { id: 'SK004', name: '枇杷秋梨酒', aroma: '果酒 12°', price: 99, scenes: ['微醺','悦己','伴手礼'], sell30: 0.66, margin: 0.55, inv: 4800, velocity: 3100, note: '发明专利产品·助农共富' },
  { id: 'SK005', name: '湄窖·黔韵', aroma: '酱香 53°', price: 428, scenes: ['商务','收藏','高端礼赠'], sell30: 0.41, margin: 0.48, inv: 900, velocity: 380, note: '老字号·独家代理' },
  { id: 'SK006', name: '浏阳河·红方', aroma: '浓香 50°', price: 158, scenes: ['口粮','宴席','聚饮'], sell30: 0.69, margin: 0.33, inv: 6700, velocity: 3400, note: '老字号·宴席基酒' },
  { id: 'SK007', name: '青花氿·青花20', aroma: '清香 53°', price: 598, scenes: ['商务','高端礼赠','收藏'], sell30: 0.35, margin: 0.52, inv: 600, velocity: 210, note: '高端形象款' },
  { id: 'SK008', name: '诗林醉·桂花酿', aroma: '露酒 18°', price: 129, scenes: ['悦己','微醺','伴手礼'], sell30: 0.49, margin: 0.50, inv: 2600, velocity: 1150, note: '新锐口味酒' },
  { id: 'SK009', name: '金钻·小酌50ml', aroma: '浓香 45°', price: 19.9, scenes: ['微醺','尝鲜','悦己'], sell30: 0.83, margin: 0.28, inv: 15000, velocity: 8200, note: '小酒赛道引流款' },
  { id: 'SK010', name: '第一河·封坛', aroma: '原浆 60°', price: 888, scenes: ['收藏','高端礼赠','商务'], sell30: 0.22, margin: 0.60, inv: 300, velocity: 95, note: '品牌制高点' },
];

const SCENES: Record<string, any> = {
  'mid-autumn': { name: '中秋礼赠', tags: ['礼赠','高端礼赠','伴手礼'], priceFit: [150,600], w: { scene:.35, price:.15, sell:.20, margin:.15, inv:.15 } },
  'newyear':    { name: '年夜饭/宴席', tags: ['宴席','聚饮','婚宴'], priceFit: [100,400], w: { scene:.35, price:.15, sell:.20, margin:.10, inv:.20 } },
  'biz':        { name: '商务宴请', tags: ['商务','高端礼赠'], priceFit: [300,900], w: { scene:.35, price:.20, sell:.10, margin:.25, inv:.10 } },
  'daily':      { name: '日常口粮', tags: ['口粮','聚饮'], priceFit: [50,250], w: { scene:.30, price:.20, sell:.25, margin:.10, inv:.15 } },
  'tipsy':      { name: '微醺悦己', tags: ['微醺','悦己','尝鲜'], priceFit: [10,150], w: { scene:.35, price:.15, sell:.25, margin:.15, inv:.10 } },
};

const SEGMENTS = [
  { key: 'vip',    name: '高价值活跃层', pct: 0.06, cnt: 10200, rfm: 'R近 F高 M高', conv: 0.18 },
  { key: 'repeat', name: '复购临期层',   pct: 0.21, cnt: 35700, rfm: 'R近 F中 M中', conv: 0.09 },
  { key: 'sleep',  name: '沉睡唤醒层',   pct: 0.38, cnt: 64600, rfm: 'R远 F低 M低', conv: 0.03 },
  { key: 'new',    name: '新客培育层',   pct: 0.35, cnt: 59500, rfm: 'R近 F0 M0',   conv: 0.05 },
];
const GOAL_TARGET: Record<string, string> = { wake: 'sleep', repurchase: 'repeat', vip: 'vip', first: 'new' };

// ---------------- 决策引擎 ----------------
function invHealth(s: any) {
  const cover = s.inv / Math.max(1, s.velocity);
  if (cover >= 1 && cover <= 3.5) return 1;
  if (cover < 1) return 0.4 + cover * 0.6;
  return Math.max(0.2, 1 - (cover - 3.5) * 0.18);
}
function priceFit(p: number, [lo, hi]: number[]) {
  if (p >= lo && p <= hi) return 1;
  const d = p < lo ? lo / p : p / hi;
  return Math.max(0, 1 - (d - 1) * 0.9);
}
function scoreSkus(scene: any, skus: any[]) {
  const maxSell = Math.max(...skus.map(s => s.sell30));
  const maxMargin = Math.max(...skus.map(s => s.margin));
  return skus.map(s => {
    const matched = s.scenes.filter((t: string) => scene.tags.includes(t));
    const parts = {
      scene: Math.min(1, matched.length / Math.max(1, scene.tags.length) * 1.6),
      price: priceFit(s.price, scene.priceFit),
      sell: s.sell30 / maxSell,
      margin: s.margin / maxMargin,
      inv: invHealth(s),
    };
    const w = scene.w;
    const total = (parts.scene*w.scene + parts.price*w.price + parts.sell*w.sell + parts.margin*w.margin + parts.inv*w.inv) * 100;
    return { sku: s, parts, matched, total: Math.round(total * 10) / 10 };
  }).sort((a, b) => b.total - a.total);
}
function adjustWeights(scene: any, goal: string) {
  const w = { ...scene.w };
  if (goal === 'margin') { w.margin += .15; w.sell -= .10; w.inv -= .05; }
  if (goal === 'clear') { w.inv += .20; w.price -= .05; w.margin -= .15; }
  return { ...scene, w };
}

// ---------------- 决策日志（Deno KV） ----------------
async function logRun(agent: string, input: any, output: any, ms: number) {
  const res = await kv.get<number>(['meta', 'counter']);
  const id = (res.value ?? 0) + 1;
  await kv.set(['meta', 'counter'], id);
  const run = { id, agent, input, output, ms, created: new Date().toISOString().replace('T',' ').slice(0,19) };
  await kv.set(['runs', id], run);
  return id;
}
async function listRuns() {
  const runs: any[] = [];
  for await (const e of kv.list({ prefix: ['runs'] }, { reverse: true, limit: 20 })) runs.push(e.value);
  return runs;
}

// ---------------- 静态文件 ----------------
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.webm': 'video/webm',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.bat': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8',
};
async function serveStatic(pathname: string) {
  let p = pathname === '/' ? '/index.html' : pathname;
  try {
    const file = await Deno.readFile(new URL(decodeURIComponent(p).replace(/^\/+/, ''), ROOT));
    const ext = p.slice(p.lastIndexOf('.'));
    return new Response(file, { headers: { 'content-type': MIME[ext] || 'application/octet-stream' } });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}

// ---------------- HTTP ----------------
const json = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const p = url.pathname;

  if (req.method === 'GET') {
    if (p === '/api/health') return json({ ok: true, service: '云酿智链 AI OS 后端（Deno）', ts: Date.now() / 1000 });
    if (p === '/api/skus') return json({ skus: SKUS });
    if (p === '/api/logs') return json({ logs: await listRuns() });
  }

  if (req.method === 'POST') {
    if (p === '/api/agent/select') {
      const t0 = performance.now();
      const body = await req.json().catch(() => ({}));
      const scene = adjustWeights(SCENES[body.scene_id] ?? SCENES['mid-autumn'], body.goal ?? 'balance');
      const topN = Math.max(1, Math.min(10, +(body.top_n ?? 4)));
      const scored = scoreSkus(scene, SKUS);
      const picks = scored.slice(0, topN), rejected = scored.slice(topN, topN + 3);
      const ms = Math.round(performance.now() - t0);
      const runId = await logRun('select', { scene: scene.name, goal: body.goal, top_n: topN },
        { picks: picks.map(r => r.sku.name) }, ms);
      return json({ run_id: runId, backend: true, ms, scene, scored, picks, rejected });
    }
    if (p === '/api/agent/private') {
      const t0 = performance.now();
      const body = await req.json().catch(() => ({}));
      const target = GOAL_TARGET[body.goal_id] ?? 'sleep';
      const primary = SEGMENTS.find(s => s.key === target)!;
      const others = SEGMENTS.filter(s => s.key !== target).sort((a, b) => b.conv - a.conv).slice(0, 2);
      const reach = Math.round(primary.cnt * 0.85);
      const conv = Math.round(reach * primary.conv);
      const gmv = Math.round(conv * (primary.key === 'vip' ? 598 : primary.key === 'new' ? 19.9 : 168));
      const ms = Math.round(performance.now() - t0);
      const runId = await logRun('private', { goal_id: body.goal_id }, { primary: primary.name, reach, conv, gmv }, ms);
      return json({ run_id: runId, backend: true, ms, primary, others, reach, conv, gmv });
    }
    return json({ error: 'not found' }, 404);
  }

  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(p);
  return json({ error: 'method not allowed' }, 405);
});
