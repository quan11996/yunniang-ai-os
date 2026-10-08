/* ============================================================
 * 云酿智链 AI OS —— 内置酒业决策引擎
 * 未接入外部大模型时，Agent 的全部推理由本引擎在本地完成，
 * 保证 Demo 全程离线可运行；接入 Jev/OpenAI 兼容接口后，
 * 推理说明文字将交给真实大模型生成。
 * ============================================================ */
const AgentEngine = {

  /* ---------- 后端服务（云酿 AI OS Server） ---------- */
  _backend: null,
  async pingBackend() {
    try {
      const r = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
      this._backend = r.ok;
    } catch (e) { this._backend = false; }
    return this._backend;
  },
  backendReady() { return this._backend === true; },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error('api ' + r.status);
    return r.json();
  },

  /* ---------- LLM 接口（Jev / OpenAI 兼容） ---------- */
  getCfg() {
    try { return JSON.parse(localStorage.getItem('yn_jev_cfg') || 'null'); } catch (e) { return null; }
  },
  llmReady() {
    const c = this.getCfg();
    return !!(c && c.endpoint && c.key && c.model);
  },
  async askLLM(prompt, timeoutMs = 12000) {
    const c = this.getCfg();
    if (!this.llmReady()) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const base = c.endpoint.replace(/\/+$/, '');
      const res = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
        body: JSON.stringify({
          model: c.model,
          messages: [
            { role: 'system', content: '你是云酿智链酒业经营决策系统，回答使用简体中文，精炼专业，不超过120字。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const j = await res.json();
      return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim() || null;
    } catch (e) { clearTimeout(timer); return null; }
  },

  /* ---------- 选品决策 ---------- */
  // 库存健康度：库存可覆盖月数 1~3 为佳
  invHealth(sku) {
    const cover = sku.inv / Math.max(1, sku.velocity);
    if (cover >= 1 && cover <= 3.5) return 1;
    if (cover < 1) return 0.4 + cover * 0.6;
    return Math.max(0.2, 1 - (cover - 3.5) * 0.18);
  },
  priceFit(price, range) {
    const [lo, hi] = range;
    if (price >= lo && price <= hi) return 1;
    const d = price < lo ? lo / price : price / hi;
    return Math.max(0, 1 - (d - 1) * 0.9);
  },

  scoreSkus(scene, skus) {
    const maxSell = Math.max(...skus.map(s => s.sell30));
    const maxMargin = Math.max(...skus.map(s => s.margin));
    return skus.map(s => {
      const matched = s.scenes.filter(t => scene.tags.includes(t));
      const parts = {
        scene: Math.min(1, matched.length / Math.max(1, scene.tags.length) * 1.6),
        price: this.priceFit(s.price, scene.priceFit),
        sell: s.sell30 / maxSell,
        margin: s.margin / maxMargin,
        inv: this.invHealth(s),
      };
      const w = scene.w;
      const total = (parts.scene * w.scene + parts.price * w.price + parts.sell * w.sell +
                     parts.margin * w.margin + parts.inv * w.inv) * 100;
      return { sku: s, parts, matched, total: Math.round(total * 10) / 10 };
    }).sort((a, b) => b.total - a.total);
  },

  buildWhy(r, scene) {
    const { sku, parts, matched } = r;
    const why = [];
    if (matched.length) why.push(`场景命中「${matched.join('、')}」`);
    if (parts.price > 0.95) why.push(`价格 ¥${sku.price} 落在${scene.name}主力带`);
    if (sku.sell30 >= 0.6) why.push(`历史30日动销 ${Math.round(sku.sell30 * 100)}%，动销确定性高`);
    if (sku.margin >= 0.45) why.push(`毛利 ${Math.round(sku.margin * 100)}%，利润空间厚`);
    const cover = (sku.inv / Math.max(1, sku.velocity)).toFixed(1);
    why.push(`库存 ${sku.inv} 件，可支撑约 ${cover} 个月动销`);
    return why.join('；');
  },

  rejectReason(r, scene) {
    const { sku, parts, matched } = r;
    if (!matched.length) return `场景标签不匹配「${scene.name}」`;
    if (parts.price < 0.5) return `价格 ¥${sku.price} 偏离目标价格带`;
    if (parts.sell < 0.5) return `历史动销偏弱（${Math.round(sku.sell30 * 100)}%），主推风险高`;
    return '综合得分低于入选线';
  },

  adjustScene(scene, goal) {
    const s = JSON.parse(JSON.stringify(scene));
    if (goal === 'margin') { s.w.margin += 0.15; s.w.sell -= 0.10; s.w.inv -= 0.05; }
    if (goal === 'clear') { s.w.inv += 0.20; s.w.price -= 0.05; s.w.margin -= 0.15; }
    return s;
  },

  async runSelect(sceneId, goal, topN) {
    const base = DB.selectScenes.find(s => s.id === sceneId) || DB.selectScenes[0];
    let res = null;
    if (this._backend !== false) {
      try {
        res = await this.post('/api/agent/select', { scene_id: sceneId, goal, top_n: topN });
      } catch (e) { this._backend = false; }
    }
    if (!res) {
      const scene = this.adjustScene(base, goal);
      const scored = this.scoreSkus(scene, DB.skus);
      res = { scored, picks: scored.slice(0, topN), rejected: scored.slice(topN, topN + 3), backend: false };
    }

    // 若已接入大模型：让真实模型为首选款生成点评
    res.llmNote = null;
    if (this.llmReady() && res.picks.length) {
      const p = res.picks[0].sku;
      res.llmNote = await this.askLLM(
        `场景「${base.name}」，主推价位带 ${base.priceFit[0]}-${base.priceFit[1]} 元。` +
        `候选酒「${p.name}」(${p.aroma}，¥${p.price}，历史30日动销${Math.round(p.sell30 * 100)}%，毛利${Math.round(p.margin * 100)}%，库存${p.inv}件)。` +
        `请用一句话给出把它选入主推清单的决策理由。`
      );
    }
    return res;
  },

  /* ---------- 私域经营决策 ---------- */
  async planPrivate(goalId) {
    const goal = DB.privateGoals.find(g => g.id === goalId) || DB.privateGoals[0];
    const primary = DB.segments.find(s => s.key === goal.target);
    const others = DB.segments.filter(s => s.key !== goal.target)
      .sort((a, b) => b.conv - a.conv).slice(0, 2);
    let reach = Math.round(primary.count * 0.85);
    let conv = Math.round(reach * primary.conv);
    let gmv = Math.round(conv * (primary.key === 'vip' ? 598 : primary.key === 'new' ? 19.9 : 168));
    let backend = false, run_id = null, ms = null;
    if (this._backend !== false) {
      try {
        const j = await this.post('/api/agent/private', { goal_id: goalId });
        reach = j.reach; conv = j.conv; gmv = j.gmv;
        backend = true; run_id = j.run_id; ms = j.ms;
      } catch (e) { this._backend = false; }
    }
    return { goal, primary, others, reach, conv, gmv, backend, run_id, ms };
  },
};
