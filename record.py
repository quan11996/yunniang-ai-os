# -*- coding: utf-8 -*-
"""云酿智链 AI OS 演示视频录制：自动走一遍完整演示流程"""
import asyncio, glob, os, sys
from playwright.async_api import async_playwright

BASE = 'http://localhost:8080/index.html#/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'video_tmp')

async def smooth_scroll(pg, sel, target, steps=14, pause=90):
    await pg.eval_on_selector(sel, f'''e=>{{
        let i=0; const step={target}/{steps};
        const t=setInterval(()=>{{e.scrollTop+=step; i++; if(i>={steps})clearInterval(t);}}, 40);
    }}''')
    await pg.wait_for_timeout(steps * 40 + pause)

async def nav(pg, v, wait=2500):
    await pg.click(f'.nav-item[data-id={v}]')
    await pg.wait_for_timeout(wait)

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(
            viewport={'width': 1600, 'height': 900},
            record_video_dir=OUT, record_video_size={'width': 1600, 'height': 900})
        pg = await ctx.new_page()

        # 1. 总览驾驶舱
        await pg.goto(BASE + 'overview')
        await pg.wait_for_timeout(3000)
        await smooth_scroll(pg, '#view', 900, pause=2500)
        await pg.eval_on_selector('#view', 'e=>e.scrollTop=0')
        await pg.wait_for_timeout(1200)

        # 2. AI OS 架构
        await nav(pg, 'arch', 3500)
        await smooth_scroll(pg, '#view', 700, pause=2200)
        await pg.eval_on_selector('#view', 'e=>e.scrollTop=0')

        # 3. 选品 Agent 运行
        await nav(pg, 'agent', 1800)
        await pg.click('#runSelect')
        await pg.wait_for_timeout(5500)
        await smooth_scroll(pg, '#view', 1400, steps=20, pause=3500)
        await pg.wait_for_timeout(1200)

        # 4. 私域 Agent 运行
        await pg.click('.agent-tab[data-t=private]')
        await pg.wait_for_timeout(1200)
        await pg.click('#runPrivate')
        await pg.wait_for_timeout(5200)
        await smooth_scroll(pg, '#view', 1200, steps=18, pause=3000)
        await pg.wait_for_timeout(800)

        # 5. Benchmark 三组盲测
        await nav(pg, 'benchmark', 1800)
        await pg.click('#runBench')
        await pg.wait_for_timeout(7800)
        await smooth_scroll(pg, '#view', 1100, steps=20, pause=4500)
        await pg.wait_for_timeout(800)

        # 6. 证据链
        await nav(pg, 'evidence', 2500)
        await smooth_scroll(pg, '#view', 500, pause=2200)

        # 7. 数据资产
        await nav(pg, 'data', 2200)
        await smooth_scroll(pg, '#view', 600, pause=2000)

        # 8. 知识产权
        await nav(pg, 'ip', 2200)
        await smooth_scroll(pg, '#view', 800, pause=2200)

        # 9. 产业价值
        await nav(pg, 'value', 2500)
        await smooth_scroll(pg, '#view', 900, pause=2500)

        # 收尾回总览
        await nav(pg, 'overview', 2200)
        await ctx.close()
        await b.close()

        vids = glob.glob(os.path.join(OUT, '*.webm'))
        if vids:
            dst = os.path.join(os.path.dirname(OUT), '云酿智链AIOS演示.webm')
            os.replace(vids[0], dst)
            print('VIDEO:', dst, os.path.getsize(dst), 'bytes')
        for f in glob.glob(os.path.join(OUT, '*')):
            os.remove(f)
        os.rmdir(OUT)

asyncio.run(main())
