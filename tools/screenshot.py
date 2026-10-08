#!/usr/bin/env python3
"""tools/screenshot.py — chụp màn hình trận đấu để AI/người xem giao diện (cần: pip install playwright + chromium).
Dùng:  python3 tools/screenshot.py out.png [rộng=390] [cao=844] [class=knight|assassin|cleric|mage]
Mở index.html, vào chế độ solo, đợi 1,8s rồi chụp. In ra lỗi JS nếu có (rỗng = không lỗi)."""
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; w = int(sys.argv[2]) if len(sys.argv) > 2 else 390; h = int(sys.argv[3]) if len(sys.argv) > 3 else 844
cls = sys.argv[4] if len(sys.argv) > 4 else "knight"
url = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate("c=>localStorage.setItem('rpgClass',c)", cls); pg.reload(); pg.wait_for_timeout(400)
    pg.click("#m-play"); pg.click("#c-ok"); pg.click("#m-solo"); pg.wait_for_timeout(1800)
    pg.screenshot(path=out); print("lỗi JS:", errs); b.close()
