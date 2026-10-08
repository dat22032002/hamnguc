#!/usr/bin/env python3
"""tools/battle-shot.py — chụp màn hình TRẬN ĐẤU thật (tự vào solo, tự chọn lối "Chiến đấu").
Cần: pip install playwright + chromium.
Dùng:  python3 tools/battle-shot.py out.png [rộng] [cao] [đường_dẫn_index.html] [m]
  - đối số cuối "m" = giả lập điện thoại (cảm ứng).  Mặc định: 1280 720, ../index.html, desktop.
Mẫu kích cỡ cần thử khi sửa giao diện: 1280 720 · 1920 1080 · 844 390 m · 390 844 m. In ra lỗi JS (rỗng = ổn)."""
import sys, os
from playwright.sync_api import sync_playwright
out=sys.argv[1]; w=int(sys.argv[2]) if len(sys.argv)>2 else 1280; h=int(sys.argv[3]) if len(sys.argv)>3 else 720; path=sys.argv[4] if len(sys.argv)>4 else os.path.abspath(os.path.join(os.path.dirname(__file__),"..","index.html")); mobile=len(sys.argv)>5 and sys.argv[5]=="m"
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":w,"height":h},is_mobile=mobile,has_touch=mobile)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://"+path); ok=False
    for i in range(15):
        pg.reload(); pg.wait_for_timeout(300)
        pg.click("#m-play"); pg.click("#c-ok"); pg.click("#m-solo"); pg.wait_for_timeout(1200)
        for bt in pg.query_selector_all("#rooms button"):
            if "Chiến đấu" in bt.inner_text(): bt.click(); ok=True; break
        if ok: break
    pg.wait_for_timeout(2500)
    pg.screenshot(path=out); print("ok",ok,"err",errs); b.close()
