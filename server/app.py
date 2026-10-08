#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云酿智链 AI OS —— 演示后端
零第三方依赖：Python 标准库 http.server + sqlite3
用法：python server/app.py   →   http://localhost:8080
"""
import json
import os
import sqlite3
import time
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yunniang.db')
PORT = int(os.environ.get('PORT') or os.environ.get('YN_PORT') or '8080')

# ================= 种子数据（与前端 data.js 同源） =================
SKUS = [
    ('SK001', '满头彩·鸿运礼盒', '浓香 52°', 368, '礼赠|婚宴|节礼', 0.71, 0.42, 3200, 1850, '自有品牌礼盒，节庆动销王'),
    ('SK002', '金钻清樽', '清香 42°', 188, '口粮|微醺|聚饮', 0.64, 0.36, 5400, 2600, '自有品牌走量款'),
    ('SK003', '蓝钻清樽', '浓香 45°', 268, '宴请|礼赠', 0.58, 0.40, 2100, 1200, '自有品牌中坚款'),
    ('SK004', '枇杷秋梨酒', '果酒 12°', 99, '微醺|悦己|伴手礼', 0.66, 0.55, 4800, 3100, '发明专利产品·助农共富'),
    ('SK005', '湄窖·黔韵', '酱香 53°', 428, '商务|收藏|高端礼赠', 0.41, 0.48, 900, 380, '老字号·独家代理'),
    ('SK006', '浏阳河·红方', '浓香 50°', 158, '口粮|宴席|聚饮', 0.69, 0.33, 6700, 3400, '老字号·宴席基酒'),
    ('SK007', '青花氿·青花20', '清香 53°', 598, '商务|高端礼赠|收藏', 0.35, 0.52, 600, 210, '高端形象款'),
    ('SK008', '诗林醉·桂花酿', '露酒 18°', 129, '悦己|微醺|伴手礼', 0.49, 0.50, 2600, 1150, '新锐口味酒'),
    ('SK009', '金钻·小酌50ml', '浓香 45°', 19.9, '微醺|尝鲜|悦己', 0.83, 0.28, 15000, 8200, '小酒赛道引流款'),
    ('SK010', '第一河·封坛', '原浆 60°', 888, '收藏|高端礼赠|商务', 0.22, 0.60, 300, 95, '品牌制高点'),
]

SCENES = {
    'mid-autumn': {'name': '中秋礼赠', 'tags': ['礼赠', '高端礼赠', '伴手礼'], 'priceFit': [150, 600],
                   'w': {'scene': .35, 'price': .15, 'sell': .20, 'margin': .15, 'inv': .15}},
    'newyear':    {'name': '年夜饭/宴席', 'tags': ['宴席', '聚饮', '婚宴'], 'priceFit': [100, 400],
                   'w': {'scene': .35, 'price': .15, 'sell': .20, 'margin': .10, 'inv': .20}},
    'biz':        {'name': '商务宴请', 'tags': ['商务', '高端礼赠'], 'priceFit': [300, 900],
                   'w': {'scene': .35, 'price': .20, 'sell': .10, 'margin': .25, 'inv': .10}},
    'daily':      {'name': '日常口粮', 'tags': ['口粮', '聚饮'], 'priceFit': [50, 250],
                   'w': {'scene': .30, 'price': .20, 'sell': .25, 'margin': .10, 'inv': .15}},
    'tipsy':      {'name': '微醺悦己', 'tags': ['微醺', '悦己', '尝鲜'], 'priceFit': [10, 150],
                   'w': {'scene': .35, 'price': .15, 'sell': .25, 'margin': .15, 'inv': .10}},
}

SEGMENTS = [
    ('vip',    '高价值活跃层', 0.06, 10200, 'R近 F高 M高', 0.18, '专属顾问1v1 + 新品优先购 + 封坛/收藏款定向推荐'),
    ('repeat', '复购临期层',   0.21, 35700, 'R近 F中 M中', 0.09, '复购周期预测触发 + 老客专享券 + 同款续购一键下单'),
    ('sleep',  '沉睡唤醒层',   0.38, 64600, 'R远 F低 M低', 0.03, '内容唤醒 → 小额券试触 → 高意向者人工跟进'),
    ('new',    '新客培育层',   0.35, 59500, 'R近 F0 M0',   0.05, '首单培育SOP + 19.9元小酌引流款 + 溯源故事种草'),
]
GOAL_TARGET = {'wake': 'sleep', 'repurchase': 'repeat', 'vip': 'vip', 'first': 'new'}


# ================= 数据库 =================
def db():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = db()
    c.execute('''CREATE TABLE IF NOT EXISTS skus(
        id TEXT PRIMARY KEY, name TEXT, aroma TEXT, price REAL, scenes TEXT,
        sell30 REAL, margin REAL, inv INTEGER, velocity INTEGER, note TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS agent_runs(
        id INTEGER PRIMARY KEY AUTOINCREMENT, agent TEXT, input TEXT,
        output TEXT, ms INTEGER, created TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS segments(
        key TEXT PRIMARY KEY, name TEXT, pct REAL, cnt INTEGER,
        rfm TEXT, conv REAL, strategy TEXT)''')
    if c.execute('SELECT COUNT(*) FROM skus').fetchone()[0] == 0:
        c.executemany('INSERT INTO skus VALUES(?,?,?,?,?,?,?,?,?,?)', SKUS)
        c.executemany('INSERT INTO segments VALUES(?,?,?,?,?,?,?)', SEGMENTS)
        c.commit()
    c.close()


# ================= 决策引擎（服务端版本） =================
def inv_health(sku):
    cover = sku['inv'] / max(1, sku['velocity'])
    if 1 <= cover <= 3.5:
        return 1.0
    if cover < 1:
        return 0.4 + cover * 0.6
    return max(0.2, 1 - (cover - 3.5) * 0.18)


def price_fit(price, rng):
    lo, hi = rng
    if lo <= price <= hi:
        return 1.0
    d = lo / price if price < lo else price / hi
    return max(0.0, 1 - (d - 1) * 0.9)


def score_skus(scene, skus):
    max_sell = max(s['sell30'] for s in skus)
    max_margin = max(s['margin'] for s in skus)
    w = dict(scene['w'])
    out = []
    for s in skus:
        tags = s['scenes'].split('|')
        matched = [t for t in tags if t in scene['tags']]
        parts = {
            'scene': min(1.0, len(matched) / max(1, len(scene['tags'])) * 1.6),
            'price': price_fit(s['price'], scene['priceFit']),
            'sell': s['sell30'] / max_sell,
            'margin': s['margin'] / max_margin,
            'inv': inv_health(s),
        }
        total = sum(parts[k] * w[k] for k in w) * 100
        sku = dict(s)
        sku['scenes'] = tags
        out.append({'sku': sku, 'parts': parts, 'matched': matched, 'total': round(total, 1)})
    return sorted(out, key=lambda r: -r['total'])


def adjust_weights(scene, goal):
    w = dict(scene['w'])
    if goal == 'margin':
        w['margin'] += .15; w['sell'] -= .10; w['inv'] -= .05
    elif goal == 'clear':
        w['inv'] += .20; w['price'] -= .05; w['margin'] -= .15
    scene['w'] = w
    return scene


def log_run(agent, inp, out, ms):
    c = db()
    cur = c.execute('INSERT INTO agent_runs(agent,input,output,ms,created) VALUES(?,?,?,?,?)',
                    (agent, json.dumps(inp, ensure_ascii=False),
                     json.dumps(out, ensure_ascii=False), ms,
                     datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    c.commit()
    rid = cur.lastrowid
    c.close()
    return rid


# ================= HTTP =================
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    # ---------- 工具 ----------
    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(n) or b'{}')

    # ---------- GET ----------
    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/api/health':
            return self._json({'ok': True, 'service': '云酿智链 AI OS 后端', 'ts': time.time()})
        if p == '/api/skus':
            c = db(); rows = [dict(r) for r in c.execute('SELECT * FROM skus')]; c.close()
            for r in rows: r['scenes'] = r['scenes'].split('|')
            return self._json({'skus': rows})
        if p == '/api/logs':
            c = db()
            rows = [dict(r) for r in c.execute(
                'SELECT id,agent,input,ms,created FROM agent_runs ORDER BY id DESC LIMIT 20')]
            c.close()
            for r in rows:
                r['input'] = json.loads(r['input'])
            return self._json({'logs': rows})
        return SimpleHTTPRequestHandler.do_GET(self)

    # ---------- POST ----------
    def do_POST(self):
        p = self.path.split('?')[0]
        if p == '/api/agent/select':
            return self._select()
        if p == '/api/agent/private':
            return self._private()
        self._json({'error': 'not found'}, 404)

    def _select(self):
        t0 = time.time()
        body = self._body()
        scene = dict(SCENES.get(body.get('scene_id', 'mid-autumn'), SCENES['mid-autumn']))
        scene = adjust_weights(scene, body.get('goal', 'balance'))
        top_n = int(body.get('top_n', 4))
        c = db(); skus = [dict(r) for r in c.execute('SELECT * FROM skus')]; c.close()
        scored = score_skus(scene, skus)
        picks, rejected = scored[:top_n], scored[top_n:top_n + 3]
        ms = int((time.time() - t0) * 1000)
        out = {'picks': picks, 'rejected': rejected,
               'scored_names': [r['sku']['name'] for r in scored]}
        rid = log_run('select', {'scene': scene['name'], 'goal': body.get('goal'), 'top_n': top_n}, out, ms)
        self._json({'run_id': rid, 'backend': True, 'ms': ms,
                    'scene': scene, 'scored': scored, 'picks': picks, 'rejected': rejected})

    def _private(self):
        t0 = time.time()
        body = self._body()
        goal_id = body.get('goal_id', 'wake')
        target = GOAL_TARGET.get(goal_id, 'sleep')
        c = db()
        segs = [dict(r) for r in c.execute('SELECT * FROM segments')]
        c.close()
        primary = next(s for s in segs if s['key'] == target)
        others = sorted([s for s in segs if s['key'] != target],
                        key=lambda s: -s['conv'])[:2]
        reach = int(primary['cnt'] * 0.85)
        conv = int(reach * primary['conv'])
        gmv = int(conv * (598 if primary['key'] == 'vip' else 19.9 if primary['key'] == 'new' else 168))
        ms = int((time.time() - t0) * 1000)
        out = {'primary': primary['name'], 'reach': reach, 'conv': conv, 'gmv': gmv}
        rid = log_run('private', {'goal_id': goal_id}, out, ms)
        self._json({'run_id': rid, 'backend': True, 'ms': ms,
                    'primary': primary, 'others': others,
                    'reach': reach, 'conv': conv, 'gmv': gmv})


def main():
    init_db()
    os.chdir(ROOT)
    srv = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'云酿智链 AI OS 后端已启动  →  http://localhost:{PORT}')
    print('接口：/api/health /api/skus /api/agent/select /api/agent/private /api/logs')
    srv.serve_forever()


if __name__ == '__main__':
    main()
