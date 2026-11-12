"""Browser smoke test of the full user flow (create, format, persist, share, import, conflict, viewer).
Run against a freshly seeded app:  pip install playwright && playwright install chromium && python e2e/smoke.py
Env: BASE_URL (default http://localhost:3000), SHOT_DIR (default docs/screenshots)."""
import re, sys
from playwright.sync_api import sync_playwright, expect
import os
BASE=os.environ.get("BASE_URL","http://localhost:3000"); SHOT=os.environ.get("SHOT_DIR","docs/screenshots")
CHROME=os.environ.get("CHROME_PATH")
FIXTURE=os.path.join(os.path.dirname(__file__),"..","tests","fixtures","sample.docx")
def login(page, email):
    page.goto(BASE+"/login"); page.get_by_text(email).click(); page.wait_for_url("**/documents")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    ctx = b.new_context(viewport={"width":1280,"height":820}); page = ctx.new_page()
    errs=[]; page.on("console", lambda m: m.type=="error" and errs.append(m.text)); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(BASE+"/login"); page.screenshot(path=f"{SHOT}/01-login.png")
    login(page,"alice@ajaia.dev"); page.screenshot(path=f"{SHOT}/02-dashboard-alice.png")
    # new doc
    page.get_by_role("button", name="+ New document").click(); page.wait_for_url(re.compile(r"/documents/.+"))
    title=page.get_by_label("Document title"); title.fill("Launch plan")
    body=page.locator(".ProseMirror"); body.click()
    page.keyboard.type("Launch plan overview")
    page.get_by_label("Text style").select_option("h1")
    page.keyboard.press("End"); page.keyboard.press("Enter")
    page.keyboard.type("This is ")
    page.keyboard.press("Control+b"); page.keyboard.type("bold"); page.keyboard.press("Control+b")
    page.keyboard.type(", "); page.get_by_role("button", name="Italic (Ctrl+I)").click(); page.keyboard.type("italic"); page.get_by_role("button", name="Italic (Ctrl+I)").click()
    page.keyboard.type(" and "); page.keyboard.press("Control+u"); page.keyboard.type("underlined"); page.keyboard.press("Control+u")
    page.keyboard.press("Enter"); page.get_by_role("button", name="Bulleted list").click()
    page.keyboard.type("First bullet"); page.keyboard.press("Enter"); page.keyboard.type("Second bullet"); page.keyboard.press("Enter"); page.keyboard.press("Enter")
    page.get_by_role("button", name="Numbered list").click(); page.keyboard.type("Step one"); page.keyboard.press("Enter"); page.keyboard.type("Step two")
    expect(page.get_by_test_id("save-status")).to_have_text(re.compile("Saved"), timeout=8000)
    page.screenshot(path=f"{SHOT}/03-editor-formatting.png")
    url=page.url
    page.reload(); page.wait_for_selector(".ProseMirror h1")
    html=page.locator(".ProseMirror").inner_html()
    for tag in ["<h1>","<strong>bold</strong>","<em>italic</em>","<u>underlined</u>","<ul>","<ol>"]:
        assert tag in html, (tag, html)
    assert page.get_by_label("Document title").input_value()=="Launch plan"
    print("persisted after reload OK")
    # share with bob as editor, carol viewer
    page.get_by_role("button", name="Share").click()
    page.get_by_label("Email address").fill("bob@ajaia.dev"); page.get_by_role("dialog").get_by_role("button", name="Share").click()
    expect(page.get_by_text("bob@ajaia.dev can now edit")).to_be_visible()
    page.get_by_label("Email address").fill("carol@ajaia.dev"); page.get_by_label("Access level").select_option("viewer"); page.get_by_role("dialog").get_by_role("button", name="Share").click()
    expect(page.get_by_text("carol@ajaia.dev can now view")).to_be_visible()
    page.screenshot(path=f"{SHOT}/04-share-dialog.png")
    page.keyboard.press("Escape")
    # import
    page.goto(BASE+"/documents")
    page.get_by_test_id("import-input").set_input_files(FIXTURE)
    page.wait_for_url(re.compile(r"/documents/.+")); page.wait_for_selector(".ProseMirror h1")
    assert "Quarterly Plan" in page.locator(".ProseMirror").inner_text()
    page.screenshot(path=f"{SHOT}/05-imported-docx.png"); print("docx import OK")
    page.goto(BASE+"/documents")
    page.get_by_test_id("import-input").set_input_files({"name":"evil.exe","mimeType":"application/octet-stream","buffer":b"MZ"})
    expect(page.get_by_role("alert").filter(has_text="evil")).to_contain_text("isn't supported"); print("unsupported type rejected in UI")
    # Bob
    ctx2=b.new_context(viewport={"width":1280,"height":820}); bp=ctx2.new_page(); bp.on("pageerror", lambda e: errs.append(str(e)))
    login(bp,"bob@ajaia.dev"); bp.screenshot(path=f"{SHOT}/06-dashboard-bob-shared.png")
    shared=bp.get_by_role("region", name=re.compile("Shared with me"))
    expect(shared.get_by_text("Launch plan", exact=True)).to_be_visible()
    expect(shared.get_by_text("Shared by Alice Mensah").first).to_be_visible()
    bp.goto(url); bp.wait_for_selector(".ProseMirror")
    bp.locator(".ProseMirror").click(); bp.keyboard.press("Control+End"); bp.keyboard.press("Enter"); bp.keyboard.type("Bob added this")
    expect(bp.get_by_test_id("save-status")).to_have_text(re.compile("Saved"), timeout=8000); print("bob (editor) saved OK")
    # conflict: alice still has old version open
    page.goto(url); page.wait_for_selector(".ProseMirror")
    bp.reload(); bp.wait_for_selector(".ProseMirror")
    bp.locator(".ProseMirror").click(); bp.keyboard.press("Control+End"); bp.keyboard.type(" again")
    expect(bp.get_by_test_id("save-status")).to_have_text(re.compile("Saved"), timeout=8000)
    page.locator(".ProseMirror").click(); page.keyboard.press("Control+End"); page.keyboard.type(" alice edit")
    expect(page.get_by_text("Someone else saved this document")).to_be_visible(timeout=8000)
    page.screenshot(path=f"{SHOT}/07-conflict.png")
    page.get_by_role("button", name="Load their version").click()
    expect(page.locator(".ProseMirror")).to_contain_text("Bob added this again"); print("conflict detected + resolved OK")
    # Carol
    ctx3=b.new_context(viewport={"width":1280,"height":820}); cp=ctx3.new_page(); cp.on("pageerror", lambda e: errs.append(str(e)))
    login(cp,"carol@ajaia.dev"); cp.goto(url); cp.wait_for_selector(".ProseMirror")
    assert cp.locator(".ProseMirror").get_attribute("contenteditable")=="false"
    assert cp.get_by_label("Document title").get_attribute("readonly") is not None
    expect(cp.get_by_text("You have view-only access")).to_be_visible()
    assert cp.get_by_role("toolbar").count()==0
    cp.screenshot(path=f"{SHOT}/08-viewer-readonly.png"); print("carol (viewer) read-only OK")
    # unshared doc 404
    cp.goto(BASE+"/documents/does-not-exist"); expect(cp.get_by_text("Document not available")).to_be_visible(); print("404 OK")
    print("console/page errors:", errs)
    b.close()
