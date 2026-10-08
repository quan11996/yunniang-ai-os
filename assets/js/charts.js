/* 轻量 SVG 图表工具 —— 零依赖，离线可渲染 */
const Charts = {

  /* 分组柱状图：data = [{y, rev, profit}] */
  revenueBars(data, w = 560, h = 240) {
    const pad = { l: 56, r: 16, t: 24, b: 34 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const max = Math.max(...data.map(d => d.rev)) * 1.15;
    const groups = data.length, gw = cw / groups, bw = Math.min(34, gw / 3);
    let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">`;
    // 网格线
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ch - ch * i / 4, v = Math.round(max * i / 4);
      s += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,.06)"/>`;
      s += `<text x="${pad.l - 8}" y="${y + 4}" fill="#6B7386" font-size="10" text-anchor="end" font-family="monospace">${v}</text>`;
    }
    data.forEach((d, i) => {
      const cx = pad.l + gw * i + gw / 2;
      const rh = ch * d.rev / max, ph = ch * d.profit / max;
      const rx = cx - bw - 4, px = cx + 4;
      s += `<rect x="${rx}" y="${pad.t + ch - rh}" width="${bw}" height="${rh}" rx="4" fill="url(#gld)" class="bar-anim"/>`;
      s += `<rect x="${px}" y="${pad.t + ch - ph}" width="${bw}" height="${ph}" rx="4" fill="#5BE0D8" opacity=".85"/>`;
      s += `<text x="${rx + bw / 2}" y="${pad.t + ch - rh - 6}" fill="#F0CE8A" font-size="10" text-anchor="middle" font-family="monospace">${d.rev}</text>`;
      s += `<text x="${px + bw / 2}" y="${pad.t + ch - ph - 6}" fill="#5BE0D8" font-size="10" text-anchor="middle" font-family="monospace">${d.profit}</text>`;
      s += `<text x="${cx}" y="${h - 12}" fill="#9AA3B5" font-size="12" text-anchor="middle">${d.y}</text>`;
    });
    s += `<defs><linearGradient id="gld" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#8A6428"/><stop offset="1" stop-color="#E8C476"/>
          </linearGradient></defs>`;
    return s + '</svg>';
  },

  /* 三组对比条形（Benchmark 表格内嵌） */
  trioBars(vals, w = 210, h = 64) {
    const max = Math.max(...vals) * 1.08;
    const colors = ['#3A4263', '#4A6B8A', '#D8A94E'];
    const bh = 14, gap = (h - bh * 3) / 2;
    let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" style="display:block">`;
    vals.forEach((v, i) => {
      const bw = Math.max(2, (w - 10) * v / max);
      s += `<rect x="4" y="${i * (bh + gap)}" width="${bw}" height="${bh}" rx="3" fill="${colors[i]}" class="bar-anim"/>`;
    });
    return s + '</svg>';
  },

  /* 环形占比（私域分层） */
  donut(segs, size = 190) {
    const R = 70, r = 46, cx = size / 2, cy = size / 2;
    const colors = ['#E8C476', '#5BE0D8', '#8A94C9', '#5BC98A'];
    let s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" style="display:block;margin:0 auto">`;
    let a0 = -Math.PI / 2;
    segs.forEach((g, i) => {
      const a1 = a0 + g.pct * Math.PI * 2;
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
      const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
      s += `<path d="M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi1},${yi1} A${r},${r} 0 ${large} 0 ${xi0},${yi0} Z"
              fill="${colors[i % 4]}" opacity=".85" stroke="#0A0D14" stroke-width="2"/>`;
      a0 = a1;
    });
    s += `<text x="${cx}" y="${cy - 4}" fill="#E9E4D8" font-size="20" text-anchor="middle" font-family="monospace" font-weight="700">17万+</text>`;
    s += `<text x="${cx}" y="${cy + 16}" fill="#6B7386" font-size="10" text-anchor="middle">私域用户</text>`;
    return s + '</svg>';
  },
};
