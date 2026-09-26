#!/usr/bin/env python3
import collections
import hashlib
import importlib.metadata
import io
import json
import os
import re
import subprocess
import sys
import time
import traceback
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from PIL import Image
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

ROOT = Path.cwd()
RUN = Path("/Users/haewonkim/.codex-fabric/project-os-artifacts/homehuddle/CHG-238-R6@46bd155dd55cbd85a29db5722c96d96c4946952b")
ATLAS = RUN / "visual-atlas"
SCREEN_DIR = ATLAS / "screenshots"
ORIGIN = "http://localhost:8081"
CARRIER_COMMIT = "0ef561e869f4bc53a2c473691bd3bd84b599f9a8"
EXPECTED_CARRIER_TREE = "fec6217a46defc2a7301a809b007801f5c5235d8"
EXPECTED_MANIFEST_SHA = "30c8a9dddf56367251c73f4809e606d37534b2623ed74c0fc28c6851a3d22277"
EXPECTED_SOURCE_SHA = "46bd155dd55cbd85a29db5722c96d96c4946952b"
EXPECTED_SOURCE_TREE = "a66760b6df143a87e894d5fe636f152ea73f6bea"
SURFACE_PATH = "manifest-validation/surface-manifest.validated.json"
RECIPES_PATH = "manifest-validation/capture-recipes.json"
WIDTHS = {"desktop": (1440, 900), "mobile": (390, 844)}
FAILED_KEYS = []
ALL_EVENTS = []
SURFACE_RESULTS = []
SCENARIO_FAILURES = []

def utcnow():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def rtk_git(*args, text_mode=True):
    out = subprocess.check_output(["rtk", "git", *args], cwd=ROOT)
    return out.decode("utf-8") if text_mode else out

def gitshow(commit, path):
    return rtk_git("show", f"{commit}:{path}", text_mode=False)

def visible_text_locator(page, label, exact=True):
    for use_exact in ([exact] if exact else [False]):
        loc = page.get_by_text(label, exact=use_exact)
        try:
            count = loc.count()
        except Exception:
            count = 0
        for i in range(count):
            item = loc.nth(i)
            try:
                if item.is_visible() and item.bounding_box():
                    return item
            except Exception:
                pass
    if exact:
        loc = page.get_by_text(label, exact=False)
        try:
            count = loc.count()
        except Exception:
            count = 0
        for i in range(count):
            item = loc.nth(i)
            try:
                if item.is_visible() and item.bounding_box():
                    return item
            except Exception:
                pass
    return None

def visible_placeholder(page, label):
    loc = page.get_by_placeholder(label, exact=True)
    try:
        count = loc.count()
    except Exception:
        count = 0
    for i in range(count):
        item = loc.nth(i)
        try:
            if item.is_visible() and item.bounding_box():
                return item
        except Exception:
            pass
    return None

def wait_text(page, label, timeout_ms=15000):
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
        loc = visible_text_locator(page, label, exact=False)
        if loc:
            return loc
        page.wait_for_timeout(100)
    return None

def click_text(page, label, exact=True):
    loc = visible_text_locator(page, label, exact=exact)
    if not loc:
        raise RuntimeError(f"visible text selector not found: {label!r}")
    loc.scroll_into_view_if_needed(timeout=10000)
    loc.click(timeout=10000)
    return {"selector_kind": "visible text", "label": label, "text": loc.inner_text()[:160]}

def placeholder_fill(page, label, value):
    loc = visible_placeholder(page, label)
    if not loc:
        raise RuntimeError(f"visible textbox placeholder not found: {label!r}")
    loc.scroll_into_view_if_needed(timeout=10000)
    loc.fill(str(value), timeout=10000)
    return {"selector_kind": "visible textbox placeholder", "label": label, "value": str(value)}

def inspect_pressables_around(locator, require_input=False, minimum=1):
    return locator.evaluate(
        """(el, args) => {
          let n = el.parentElement;
          for (let depth = 0; n && depth < 12; depth++, n = n.parentElement) {
            const controls = Array.from(n.querySelectorAll('[tabindex="0"]')).filter(x => {
              const r = x.getBoundingClientRect();
              const s = getComputedStyle(x);
              return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
            });
            if ((args.requireInput ? n.querySelector('input,textarea') : true) && controls.length >= args.minimum) {
              const r = n.getBoundingClientRect();
              return {
                ancestor: {tag:n.tagName, text:(n.innerText||'').slice(0,120), x:r.x, y:r.y, w:r.width, h:r.height},
                controls: controls.map(x => {
                  const b=x.getBoundingClientRect();
                  return {tag:x.tagName, text:(x.innerText||'').slice(0,80), aria:x.getAttribute('aria-label'),
                    x:b.x,y:b.y,w:b.width,h:b.height,html:x.outerHTML.slice(0,260)};
                })
              };
            }
          }
          return null;
        }""",
        {"requireInput": require_input, "minimum": minimum},
    )

def visible_input_locators(page):
    out = []
    inputs = page.locator("input,textarea")
    for i in range(inputs.count()):
        item = inputs.nth(i)
        try:
            if item.is_visible() and item.bounding_box():
                out.append(item)
        except Exception:
            pass
    return out

def fill_labeled_textbox(page, label, value):
    anchor = visible_text_locator(page, label, exact=True)
    if not anchor:
        raise RuntimeError(f"visible field label not found: {label!r}")
    ab = anchor.bounding_box()
    candidates = []
    for item in visible_input_locators(page):
        b = item.bounding_box()
        if b and b["y"] >= ab["y"] + ab["height"] - 2:
            candidates.append((b["y"] - ab["y"], item, b))
    if not candidates:
        raise RuntimeError(f"visible textbox following label not found: {label!r}")
    candidates.sort(key=lambda x: x[0])
    chosen = candidates[0][1]
    chosen.scroll_into_view_if_needed(timeout=10000)
    chosen.fill(str(value), timeout=10000)
    return {"label": label, "value": str(value), "bounds": candidates[0][2]}

def parse_bounds(bounds_text):
    values = {}
    for key in ("x", "y", "w", "h", "cx", "cy"):
        match = re.search(r"(?:\b" + key + r"\s*=\s*|['\"]" + key + r"['\"]\s*:\s*)(-?\d+(?:\.\d+)?)", bounds_text)
        if match:
            values[key] = float(match.group(1))
    if all(k in values for k in ("x", "y", "w", "h")):
        values.setdefault("cx", values["x"] + values["w"] / 2)
        values.setdefault("cy", values["y"] + values["h"] / 2)
        return values
    raise RuntimeError(f"accepted runtime bounds are not parseable: {bounds_text!r}")

def hit_test(page, x, y):
    return page.evaluate(
        """([x,y]) => {
          const e=document.elementFromPoint(x,y);
          if (!e) return null;
          const r=e.getBoundingClientRect();
          return {tag:e.tagName, text:(e.innerText||'').slice(0,90), aria:e.getAttribute('aria-label'),
            testid:e.getAttribute('data-testid'), x:r.x,y:r.y,w:r.width,h:r.height,html:e.outerHTML.slice(0,220)};
        }""",
        [x, y],
    )

def click_measured_bounds(page, selector):
    b = parse_bounds(selector.get("runtime_bounds", ""))
    x, y = b["cx"], b["cy"]
    vp = page.evaluate("() => ({width:innerWidth,height:innerHeight})")
    if not (0 <= x < vp["width"] and 0 <= y < vp["height"]):
        raise RuntimeError(f"accepted measured click point outside current viewport: point=({x},{y}), viewport={vp}")
    hit = hit_test(page, x, y)
    page.mouse.click(x, y)
    return {"selector_kind": selector.get("kind"), "runtime_bounds": selector.get("runtime_bounds"), "click_point": [x, y], "visible_hit_test": hit}

def find_row_box(page, label):
    loc = visible_text_locator(page, label, exact=True)
    if not loc:
        loc = visible_text_locator(page, label, exact=False)
    if not loc:
        raise RuntimeError(f"visible row label not found: {label!r}")
    loc.scroll_into_view_if_needed(timeout=10000)
    return loc, loc.evaluate(
        """el => {
          let n=el, best=null;
          for (let depth=0;n && depth<12;depth++,n=n.parentElement) {
            const r=n.getBoundingClientRect();
            const visible=r.width>0 && r.height>0;
            if (visible && r.width>=220 && r.height>=22 && r.height<=180) {
              best={tag:n.tagName, role:n.getAttribute('role'), text:(n.innerText||'').slice(0,180),
                x:r.x,y:r.y,w:r.width,h:r.height,tabindex:n.getAttribute('tabindex')};
              if (n.getAttribute('tabindex')==='0' || n.getAttribute('role')==='button') return best;
              if (!best.fallback) best.fallback=true;
            }
          }
          return best;
        }"""
    )

def long_press_text(page, label):
    loc, row = find_row_box(page, label)
    b = loc.bounding_box()
    if not b:
        raise RuntimeError(f"visible row text has no bounds: {label!r}")
    x, y = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
    page.mouse.move(x, y)
    page.mouse.down()
    page.wait_for_timeout(700)
    page.mouse.up()
    return {"gesture": "visible long press", "label": label, "text_bounds": b, "row_bounds": row, "duration_ms": 700}

def swipe_left_row(page, label, distance=220):
    loc, row = find_row_box(page, label)
    if not row:
        raise RuntimeError(f"visible row bounds not found for swipe: {label!r}")
    x0 = row["x"] + row["w"] - 5
    x1 = x0 - distance
    y = row["y"] + row["h"] / 2
    vp = page.evaluate("() => ({width:innerWidth,height:innerHeight})")
    if x0 >= vp["width"] or x1 < row["x"]:
        raise RuntimeError(f"recipe swipe geometry does not fit visible row: row={row}, viewport={vp}, distance={distance}")
    page.mouse.move(x0, y)
    page.mouse.down()
    page.mouse.move(x1, y, steps=10)
    page.mouse.up()
    return {"gesture": "visible left swipe", "label": label, "distance_css_px": distance, "row_bounds": row, "from": [x0,y], "to": [x1,y]}

def click_profile_avatar(page):
    data = page.locator('[tabindex="0"]').evaluate_all(
        """es => es.map(e => {
          const r=e.getBoundingClientRect(), s=getComputedStyle(e);
          return {text:(e.innerText||'').slice(0,80), aria:e.getAttribute('aria-label'), testid:e.getAttribute('data-testid'),
            x:r.x,y:r.y,w:r.width,h:r.height,display:s.display,visibility:s.visibility,
            svg:e.querySelectorAll('svg').length,img:e.querySelectorAll('img').length,html:e.outerHTML.slice(0,220)};
        }).filter(x => x.w>=45 && x.w<=80 && x.h>=45 && x.h<=80 && x.y>=0 && x.y<150 && x.x+x.w>=innerWidth-80)
        .sort((a,b)=>b.x-a.x)"""
    )
    if len(data) != 1:
        raise RuntimeError(f"source-defined top-right AmbientHUD avatar target was not unique: {data}")
    target = data[0]
    page.mouse.click(target["x"] + target["w"]/2, target["y"] + target["h"]/2)
    return {"selector_kind": "visible action observed by runtime probe", "source_target": "AmbientHUD top-right profile avatar", "target": target}

def click_member_edit(page, label):
    loc = visible_text_locator(page, label, exact=True)
    if not loc:
        raise RuntimeError(f"member label not visible: {label!r}")
    loc.scroll_into_view_if_needed(timeout=10000)
    info = loc.evaluate(
        """el => {
          let n=el.parentElement;
          for(let depth=0;n && depth<10;depth++,n=n.parentElement) {
            const controls=Array.from(n.querySelectorAll('[tabindex="0"]')).filter(x=>{
              const r=x.getBoundingClientRect(),s=getComputedStyle(x); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
            });
            if(controls.length>=2 && (n.innerText||'').includes(el.textContent.trim())) {
              const r=n.getBoundingClientRect();
              return {row:{x:r.x,y:r.y,w:r.width,h:r.height,text:(n.innerText||'').slice(0,140)},
                controls:controls.slice(0,3).map(x=>{const b=x.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,text:(x.innerText||'').slice(0,50),html:x.outerHTML.slice(0,180)}})};
            }
          }
          return null;
        }"""
    )
    if not info or len(info["controls"]) < 2:
        raise RuntimeError(f"visible Sarah Kim row edit action was not identified from source order: {info}")
    target = info["controls"][0]
    page.mouse.click(target["x"] + target["w"]/2, target["y"] + target["h"]/2)
    return {"selector_kind": "icon-only member action", "member": label, "source_target": "first member action (Pencil edit, source order)", "row": info["row"], "target": target}

def visible_plus_after_input(page, input_locator):
    info = inspect_pressables_around(input_locator, require_input=True, minimum=2)
    if not info or len(info["controls"]) < 2:
        raise RuntimeError(f"visible Quick Add plus control was not found beside the named textbox: {info}")
    target = info["controls"][-1]
    x, y = target["x"] + target["w"]/2, target["y"] + target["h"]/2
    page.mouse.click(x, y)
    return {"source_target": "last visible Quick Add control after X clear control (Plus, source order)", "group": info["ancestor"], "target": target, "click_point": [x,y]}

def click_row_checkbox(page, label):
    loc, row = find_row_box(page, label)
    target_data = loc.evaluate(
        """el => {
          let n=el.parentElement;
          for(let depth=0;n && depth<12;depth++,n=n.parentElement) {
            const controls=Array.from(n.querySelectorAll('[tabindex="0"]')).filter(x=>{
              const r=x.getBoundingClientRect(),s=getComputedStyle(x); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
            });
            const r=n.getBoundingClientRect();
            if(controls.length && r.width>=220 && r.height>=22 && r.height<=180) {
              const rows=controls.map(x=>{const b=x.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,text:(x.innerText||'').slice(0,50),svg:x.querySelectorAll('svg').length,html:x.outerHTML.slice(0,180)}});
              return {row:{x:r.x,y:r.y,w:r.width,h:r.height,text:(n.innerText||'').slice(0,160)},controls:rows};
            }
          }
          return null;
        }"""
    )
    if not target_data or not target_data["controls"]:
        raise RuntimeError(f"visible checkbox action in named row was not identified: {target_data}")
    # The accepted row-checkbox selector resolves to the first visible control at the row's leading edge.
    target = target_data["controls"][0]
    page.mouse.click(target["x"] + target["w"]/2, target["y"] + target["h"]/2)
    return {"selector_kind": "named row checkbox", "label": label, "row": target_data["row"], "target": target}

def market_disposable_create(page):
    if not wait_text(page, "New Market Item", timeout_ms=10000):
        raise RuntimeError("visible New Market Item modal title was not ready")
    entered = []
    entered.append(placeholder_fill(page, "Item name", "R5 Disposable Market Item"))
    # The accepted action creates a local disposable item. Price is a required visible field with no default in Product source;
    # use the minimum valid local value so the specified create action can complete, without writing Product state outside its UI.
    entered.append(placeholder_fill(page, "e.g. 150", "1"))
    click_text(page, "Limited", exact=True)
    entered.append(placeholder_fill(page, "Number of units", "1"))
    click_text(page, "Add to Market", exact=True)
    return {"selector_kind": "visible form controls", "anchors": ["New Market Item", "Add to Market"], "visible_ui_values": entered, "limited_stock_selected": True}

def restock_disposable_add(page, label):
    field = visible_placeholder(page, "I need...")
    if not field:
        raise RuntimeError("visible Quick Add textbox placeholder not found")
    field.scroll_into_view_if_needed(timeout=10000)
    field.fill(label, timeout=10000)
    plus = visible_plus_after_input(page, field)
    return {"selector_kind": "named visible item", "label": label, "typed_into_visible_placeholder": "I need...", "visible_plus": plus}

def perform_action(page, action):
    selector = action.get("selector", {})
    kind = selector.get("kind")
    label = selector.get("label")
    if kind == "route":
        target = ORIGIN + label
        response = page.goto(target, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(250)
        return {"selector_kind": kind, "route": label, "http_status": response.status if response else None}
    if kind == "visible fixture control":
        logo = page.locator('[data-testid="logo-trigger"]')
        logo.wait_for(state="visible", timeout=15000)
        logo.click(timeout=10000)
        logo.click(timeout=10000)
        modal = wait_text(page, "Developer Control", timeout_ms=10000)
        bypass = visible_text_locator(page, "Instant Bypass Login", exact=True)
        if not modal or not bypass:
            raise RuntimeError("two-tap Developer Control did not expose visible Instant Bypass Login")
        bypass.scroll_into_view_if_needed(timeout=10000)
        bypass.click(timeout=10000)
        page.wait_for_timeout(350)
        return {"selector_kind": kind, "entry": "two visible taps on source Logo3D data-testid=logo-trigger", "bypass": "visible Instant Bypass Login"}
    if kind == "icon-only relative geometry" or kind == "icon-only floating action button":
        return click_measured_bounds(page, selector)
    if kind == "visible action observed by runtime probe":
        if label and label.startswith("top-right profile avatar"):
            return click_profile_avatar(page)
        if label and label.startswith("long press visible market item "):
            return long_press_text(page, label.rsplit(" ", 1)[-1])
        raise RuntimeError(f"unmapped runtime-probed visible action: {label!r}")
    if kind == "icon-only member action":
        return click_member_edit(page, label)
    if kind == "named visible row gesture":
        match = re.search(r"row '([^']+)'", selector.get("evidence", ""))
        if not match:
            raise RuntimeError(f"accepted row gesture evidence did not identify a visible row: {selector}")
        return swipe_left_row(page, match.group(1), 220)
    if kind == "visible text anchor":
        evidence = selector.get("evidence", "")
        match = re.search(r"to the (.+?) card", evidence, re.I)
        target = match.group(1) if match else label
        loc = visible_text_locator(page, target, exact=False)
        if not loc:
            raise RuntimeError(f"visible scroll anchor was not found: {target!r}")
        loc.scroll_into_view_if_needed(timeout=10000)
        return {"selector_kind": kind, "scroll_anchor": target, "bounds": loc.bounding_box()}
    if kind in ("visible text", "visible label", "visible button text", "visible pressable text", "visible tab text", "visible action text"):
        return click_text(page, label, exact=True)
    if kind == "textbox placeholder":
        if action.get("value") is None:
            raise RuntimeError(f"accepted textbox action has no value: {action}")
        return placeholder_fill(page, label, action["value"])
    if kind == "placeholder text":
        value = action.get("value")
        if value is None:
            quoted = re.search(r"(?:with|enter|fill)\s+[\"']([^\"']+)[\"']", action.get("action", ""), re.I)
            if not quoted:
                raise RuntimeError(f"accepted placeholder action has no visible value: {action}")
            value = quoted.group(1)
        return placeholder_fill(page, label, value)
    if kind == "visible labeled textboxes":
        vals = {"Goal Name": "R5 Disposable Goal", "Target Points": "1"}
        result = []
        for field in selector.get("labels", []):
            if field not in vals:
                raise RuntimeError(f"unmapped accepted labeled textbox: {field!r}")
            result.append(fill_labeled_textbox(page, field, vals[field]))
        return {"selector_kind": kind, "fields": result}
    if kind == "visible form controls":
        return market_disposable_create(page)
    if kind == "named visible row":
        return long_press_text(page, label)
    if kind == "named visible item":
        return restock_disposable_add(page, label)
    if kind == "named row checkbox":
        result = click_row_checkbox(page, label)
        page.wait_for_timeout(2100)
        result["confirmation_wait_ms"] = 2100
        return result
    raise RuntimeError(f"no action mapping for accepted selector kind {kind!r}")

def viewport_box(width, height):
    return {"width": width, "height": height}

def route_value(url):
    parts = urlsplit(url)
    return parts.path + (("?" + parts.query) if parts.query else "")

def overlay_findings(page):
    return page.evaluate(
        """() => {
          const patterns=[
            /LogBox|RedBox|Bundling failed|Metro encountered an error|Application error/i,
            /Uncaught Error|Something went wrong|Unable to resolve module/i,
            /Development server returned response error code/i
          ];
          const text=(document.body?.innerText||'').slice(0,30000);
          const matches=patterns.map(p=>({pattern:String(p),matched:p.test(text)})).filter(x=>x.matched);
          const nodes=Array.from(document.querySelectorAll('[role="alert"],[data-testid*="error" i],[class*="error-overlay" i],[class*="logbox" i]')).filter(e=>{
            const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
          }).map(e=>({tag:e.tagName,role:e.getAttribute('role'),testid:e.getAttribute('data-testid'),text:(e.innerText||'').slice(0,240)}));
          return {matches,nodes};
        }"""
    )

def ready_visible(page, assertion):
    value = assertion.get("value", "")
    loc = wait_text(page, value, timeout_ms=15000)
    if not loc:
        return {"passed": False, "kind": assertion.get("kind"), "value": value, "evidence": "visible text not found within 15 seconds"}
    return {"passed": True, "kind": assertion.get("kind"), "value": value, "text": loc.inner_text()[:240], "bounds": loc.bounding_box()}

def asset_state(page, timeout_ms=8000):
    began = time.monotonic()
    font = None
    font_error = None
    try:
        font = page.evaluate("async () => { await document.fonts.ready; return {status:document.fonts.status, check:document.fonts.check('16px sans-serif')}; }")
    except Exception as exc:
        font_error = f"{type(exc).__name__}: {exc}"
    image_wait = "complete"
    try:
        page.wait_for_function(
            """() => Array.from(document.images).filter(i => {
              const r=i.getBoundingClientRect();
              return r.width>0 && r.height>0 && r.bottom>0 && r.right>0 && r.top<innerHeight && r.left<innerWidth;
            }).every(i=>i.complete)""",
            timeout=timeout_ms,
        )
    except PlaywrightTimeoutError:
        image_wait = "visible_image_timeout"
    images = page.evaluate(
        """() => Array.from(document.images).map(i=>{
          const r=i.getBoundingClientRect();
          const visible=r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
          return {src:i.currentSrc||i.src,alt:i.alt||'',visible,complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight};
        })"""
    )
    visible_images = [i for i in images if i["visible"]]
    broken_visible = [i for i in visible_images if not i["complete"] or i["naturalWidth"] <= 0]
    return {
        "fonts": font, "font_error": font_error, "image_wait": image_wait,
        "visible_image_count": len(visible_images), "visible_images": visible_images,
        "broken_visible_images": broken_visible,
        "elapsed_ms": round((time.monotonic()-began)*1000, 1),
    }

def settle_page(page):
    result = {"network_idle": "not_attempted"}
    t0 = time.monotonic()
    try:
        page.wait_for_load_state("networkidle", timeout=2500)
        result["network_idle"] = "passed"
    except PlaywrightTimeoutError:
        result["network_idle"] = "timed_out"
    result["network_idle_wait_ms"] = round((time.monotonic()-t0)*1000,1)
    page.wait_for_timeout(250)
    result["assets"] = asset_state(page)
    return result

def attach_observers(page, key):
    local = []
    def add(kind, **fields):
        event = {"surface_key": key, "timestamp_utc": utcnow(), "type": kind, **fields}
        local.append(event)
        ALL_EVENTS.append(event)
    page.on("console", lambda msg: add("console", severity=msg.type, text=msg.text[:2000], location=msg.location))
    page.on("pageerror", lambda err: add("pageerror", text=str(err)[:3000]))
    page.on("requestfailed", lambda req: add("request_failed", url=req.url, method=req.method, failure=req.failure))
    page.on("response", lambda res: add("http_status_ge_400", status=res.status, url=res.url, method=res.request.method) if res.status >= 400 else None)
    return local

def new_context(browser, color_scheme="light", reduced_motion="no-preference"):
    context = browser.new_context(
        viewport=viewport_box(*WIDTHS["mobile"]),
        device_scale_factor=1,
        locale="en-US",
        timezone_id="America/Chicago",
        color_scheme=color_scheme,
        reduced_motion=reduced_motion,
    )
    return context

def begin_recipe_context(browser, surface, recipe, color_scheme="light", reduced_motion="no-preference"):
    context = new_context(browser, color_scheme=color_scheme, reduced_motion=reduced_motion)
    page = context.new_page()
    events = attach_observers(page, surface["surface_key"])
    start_route = "/" if recipe["start_context"] in ("auth-root", "seeded-app") else "/onboarding"
    t0 = time.monotonic()
    response = page.goto(ORIGIN + start_route, wait_until="domcontentloaded", timeout=30000)
    nav_ms = round((time.monotonic()-t0)*1000,1)
    page.wait_for_timeout(300)
    return context, page, events, {"start_route": start_route, "start_http_status": response.status if response else None, "start_navigation_ms": nav_ms}

def execute_recipe_actions(page, recipe, action_records):
    explicit_fixture_action = any(a.get("selector", {}).get("kind") == "visible fixture control" for a in recipe["ordered_visible_user_actions"])
    if recipe["start_context"] == "seeded-app" and not explicit_fixture_action:
        synthetic_action = {"action": "Seeded-app precondition: use visible Developer Control two-tap and explicit bypass", "selector": {"kind": "visible fixture control", "label": "Developer Control; Instant Bypass Login"}}
        began = time.monotonic()
        row = {"order": 0, "action": synthetic_action["action"], "selector": synthetic_action["selector"], "started_utc": utcnow()}
        try:
            row["evidence"] = perform_action(page, synthetic_action)
            row["passed"] = True
        except Exception as exc:
            row["passed"] = False
            row["error"] = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            row["elapsed_ms"] = round((time.monotonic()-began)*1000,1)
            row["ended_utc"] = utcnow()
            action_records.append(row)
    for index, action in enumerate(recipe["ordered_visible_user_actions"], start=1):
        began = time.monotonic()
        row = {"order": index, "action": action["action"], "selector": action.get("selector"), "started_utc": utcnow()}
        try:
            row["evidence"] = perform_action(page, action)
            row["passed"] = True
        except Exception as exc:
            row["passed"] = False
            row["error"] = f"{type(exc).__name__}: {exc}"
            row["traceback"] = traceback.format_exc(limit=3)
            raise
        finally:
            row["elapsed_ms"] = round((time.monotonic()-began)*1000,1)
            row["ended_utc"] = utcnow()
            action_records.append(row)
        page.wait_for_timeout(180)

def normalized_route_equal(actual, expected):
    return route_value(actual).rstrip("/") == (expected.rstrip("/") or "/")

def screenshot_viewport(page, surface, viewport_name, target_path, assertion):
    width, height = WIDTHS[viewport_name]
    page.set_viewport_size(viewport_box(width, height))
    page.wait_for_timeout(180)
    before = ready_visible(page, assertion)
    if not before["passed"]:
        return {"passed": False, "viewport": viewport_name, "expected_dimensions": [width,height], "ready_before": before}
    viewport = page.evaluate("() => ({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})")
    if viewport != {"width": width, "height": height, "dpr": 1}:
        return {"passed": False, "viewport": viewport_name, "expected_dimensions": [width,height], "actual_viewport": viewport, "error": "CSS viewport or DPR mismatch"}
    t0 = time.monotonic()
    target_path.parent.mkdir(parents=True, exist_ok=True)
    data = page.screenshot(path=str(target_path), type="png", full_page=False, animations="allow")
    elapsed = round((time.monotonic()-t0)*1000,1)
    after = ready_visible(page, assertion)
    with Image.open(io.BytesIO(data)) as im:
        size = list(im.size)
        png_format = im.format
    digest = sha256(data)
    return {
        "passed": size == [width,height] and png_format == "PNG" and after["passed"],
        "viewport": viewport_name,
        "css_viewport": viewport,
        "dimensions": size,
        "png_format": png_format,
        "sha256": digest,
        "artifact": target_path.relative_to(ATLAS).as_posix(),
        "captured_at_utc": utcnow(),
        "screenshot_elapsed_ms": elapsed,
        "ready_before": before,
        "ready_after": after,
    }

def process_surface(browser, surface, recipe, surface_index):
    key = surface["surface_key"]
    result = {
        "surface_key": key, "label": surface["label"], "route": surface["route"], "owner": surface["owner"],
        "classification": recipe["classification"], "capture_recipe_id": surface["capture_recipe_id"],
        "start_context": recipe["start_context"], "ready_assertion": recipe["ready_assertion"],
        "state": surface["state"], "started_at_utc": utcnow(), "actions": [], "screenshots": {},
        "status": "RUNNING", "failures": [],
    }
    context = None
    page = None
    events = []
    timings = {}
    try:
        context, page, events, nav = begin_recipe_context(browser, surface, recipe)
        result["runtime_start"] = nav
        action_start = time.monotonic()
        execute_recipe_actions(page, recipe, result["actions"])
        timings["actions_elapsed_ms"] = round((time.monotonic()-action_start)*1000,1)
        settle = settle_page(page)
        result["settle"] = settle
        ready = ready_visible(page, recipe["ready_assertion"])
        result["ready_before_capture"] = ready
        if not ready["passed"]:
            result["failures"].append({"class": "ready_assertion_failed", "evidence": ready})
        current_route = route_value(page.url)
        result["captured_route"] = current_route
        result["route_matches_manifest"] = normalized_route_equal(page.url, surface["route"])
        if not result["route_matches_manifest"]:
            result["failures"].append({"class": "route_mismatch", "expected": surface["route"], "actual": current_route})
        result["visible_error_overlay"] = overlay_findings(page)
        if result["visible_error_overlay"]["matches"] or result["visible_error_overlay"]["nodes"]:
            result["failures"].append({"class": "visible_error_overlay", "evidence": result["visible_error_overlay"]})
        if settle["assets"]["broken_visible_images"]:
            result["failures"].append({"class": "visible_asset_not_ready", "evidence": settle["assets"]["broken_visible_images"]})
        if not ready["passed"]:
            result["status"] = "FAILED"
        else:
            for viewport_name in ("mobile", "desktop"):
                width,height = WIDTHS[viewport_name]
                artifact = surface["canonical"][viewport_name]["artifact"]
                target_path = ATLAS / artifact
                snap = screenshot_viewport(page, surface, viewport_name, target_path, recipe["ready_assertion"])
                result["screenshots"][viewport_name] = snap
                if not snap["passed"]:
                    result["failures"].append({"class": "screenshot_or_ready_assertion_failed", "viewport": viewport_name, "evidence": snap})
                overlay = overlay_findings(page)
                if overlay["matches"] or overlay["nodes"]:
                    result["failures"].append({"class": "visible_error_overlay", "viewport": viewport_name, "evidence": overlay})
                result["viewport_events"] = result.get("viewport_events", [])
                result["viewport_events"].append({"viewport": viewport_name, "overlay": overlay, "route": route_value(page.url)})
            page.wait_for_timeout(120)
            # Page exceptions are invalidating; ordinary console warnings/errors and request failures remain recorded.
            pageerrors = [e for e in events if e["type"] == "pageerror"]
            if pageerrors:
                result["failures"].append({"class": "pageerror", "events": pageerrors})
            # A top-level navigation returning HTTP >= 400 is a broken route. Other HTTP failures remain runtime evidence.
            if nav["start_http_status"] and nav["start_http_status"] >= 400:
                result["failures"].append({"class": "start_route_http_error", "status": nav["start_http_status"]})
        result["runtime_events"] = events
    except Exception as exc:
        result["status"] = "FAILED"
        result["failures"].append({"class": "recipe_execution_failed", "error": f"{type(exc).__name__}: {exc}", "traceback": traceback.format_exc(limit=5)})
        result["runtime_events"] = events
    finally:
        result["timings"] = timings
        result["ended_at_utc"] = utcnow()
        if context:
            try:
                context.close()
            except Exception as exc:
                result["failures"].append({"class": "context_close_failed", "error": str(exc)})
    if result["failures"]:
        result["status"] = "FAILED"
        FAILED_KEYS.append(key)
    else:
        result["status"] = "CAPTURED"
    print(json.dumps({"progress": f"{surface_index}/65", "surface_key": key, "status": result["status"], "screenshot_count": len(result["screenshots"]), "failures": result["failures"][:1]}, ensure_ascii=False), flush=True)
    return result

def stress_run_recipe(browser, surface, recipe, scenario_name, color_scheme="light", reduced_motion="no-preference"):
    context = None
    page = None
    events = []
    record = {"surface_key": surface["surface_key"], "scenario": scenario_name, "color_scheme": color_scheme, "reduced_motion": reduced_motion, "started_at_utc": utcnow(), "failures": []}
    try:
        context, page, events, nav = begin_recipe_context(browser, surface, recipe, color_scheme=color_scheme, reduced_motion=reduced_motion)
        record["runtime_start"] = nav
        actions = []
        execute_recipe_actions(page, recipe, actions)
        record["actions_executed"] = actions
        settle = settle_page(page)
        record["settle"] = settle
        ready = ready_visible(page, recipe["ready_assertion"])
        record["ready_assertion"] = ready
        record["route"] = route_value(page.url)
        record["route_matches_manifest"] = normalized_route_equal(page.url, surface["route"])
        record["events"] = events
        if not ready["passed"]:
            record["failures"].append({"class": "ready_assertion_failed", "evidence": ready})
        if not record["route_matches_manifest"]:
            record["failures"].append({"class": "route_mismatch", "expected": surface["route"], "actual": record["route"]})
        if settle["assets"]["broken_visible_images"]:
            record["failures"].append({"class": "visible_asset_not_ready", "evidence": settle["assets"]["broken_visible_images"]})
        overlay = overlay_findings(page)
        record["overlay"] = overlay
        if overlay["matches"] or overlay["nodes"]:
            record["failures"].append({"class": "visible_error_overlay", "evidence": overlay})
        record["pageerrors"] = [e for e in events if e["type"] == "pageerror"]
        if record["pageerrors"]:
            record["failures"].append({"class": "pageerror", "events": record["pageerrors"]})
        record["page"] = page
        record["context"] = context
        return record
    except Exception as exc:
        record["failures"].append({"class": "recipe_replay_failed", "error": f"{type(exc).__name__}: {exc}", "traceback": traceback.format_exc(limit=4)})
        record["events"] = events
        if context:
            context.close()
        record["page"] = None
        record["context"] = None
        return record

def inspect_stress_viewport(record, viewport_name, width, height):
    page = record.get("page")
    if not page:
        return {"viewport_name": viewport_name, "viewport": [width,height], "status": "FAILED", "failure_classes": [f["class"] for f in record["failures"]]}
    key = record["surface_key"]
    try:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(180)
        ready = ready_visible(page, record.get("ready_assertion", {})) if record.get("ready_assertion") else {"passed": True}
        # Keep the recipe ready value with the stress record at context creation.
        if not record.get("ready_assertion"):
            ready = wait_text(page, record["_ready_value"], timeout_ms=3000) is not None
            ready = {"passed": bool(ready), "value": record["_ready_value"]}
        overflow = page.evaluate("() => ({viewport_width:innerWidth,document_width:document.documentElement.scrollWidth,body_width:document.body.scrollWidth,viewport_height:innerHeight,dpr:devicePixelRatio})")
        overlay = overlay_findings(page)
        buffers = page.screenshot(type="png", full_page=False, animations="allow")
        with Image.open(io.BytesIO(buffers)) as im:
            dimensions = list(im.size)
        event_count = len(record.get("events", []))
        failures = []
        if not ready.get("passed"):
            failures.append("ready_assertion_failed")
        if overflow["document_width"] > width + 1 or overflow["body_width"] > width + 1:
            failures.append("horizontal_overflow")
        if overlay["matches"] or overlay["nodes"]:
            failures.append("visible_error_overlay")
        if dimensions != [width,height]:
            failures.append("viewport_dimensions_mismatch")
        fresh_errors = [e for e in record.get("events", [])[event_count:] if e["type"] == "pageerror"]
        if fresh_errors:
            failures.append("pageerror")
        item = {
            "surface_key": key, "variant": viewport_name, "viewport_css_px": [width,height], "dpr": overflow["dpr"],
            "ready_assertion": ready, "route": route_value(page.url), "horizontal_metrics": overflow,
            "visible_error_overlay": overlay, "transient_screenshot_sha256": sha256(buffers),
            "transient_screenshot_dimensions": dimensions, "failure_classes": failures,
            "observed_at_utc": utcnow(),
        }
        if failures:
            SCENARIO_FAILURES.append({"surface_key": key, "variant": viewport_name, "failure_classes": failures})
        return item
    except Exception as exc:
        failures = ["stress_viewport_capture_failed"]
        SCENARIO_FAILURES.append({"surface_key": key, "variant": viewport_name, "failure_classes": failures, "error": f"{type(exc).__name__}: {exc}"})
        return {"surface_key": key, "variant": viewport_name, "viewport_css_px": [width,height], "failure_classes": failures, "error": f"{type(exc).__name__}: {exc}", "observed_at_utc": utcnow()}

def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def make_reader_pdfs(surfaces, capture_results):
    from reportlab.lib.colors import HexColor, white
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    from pypdf import PdfReader

    by_key = {r["surface_key"]: r for r in capture_results}
    reader_pages = {"desktop": [], "mobile": []}
    pdf_meta = {}
    for viewport in ("desktop","mobile"):
        w,h = WIDTHS[viewport]
        header_h, footer_h = 22, 24
        path = ATLAS / f"review-{viewport}.pdf"
        c = canvas.Canvas(str(path), pagesize=(w, h+header_h+footer_h), pageCompression=1, invariant=1)
        c.setTitle(f"HomeHuddle canonical visual atlas review - {viewport}")
        c.setAuthor("Project OS visual atlas capture")
        c.setSubject("Canonical screenshot review pages bound by PNG SHA-256")
        for i,s in enumerate(surfaces, start=1):
            row = by_key[s["surface_key"]]
            shot = row["screenshots"][viewport]
            img = ATLAS / shot["artifact"]
            c.setFillColor(white)
            c.rect(0,0,w,h+header_h+footer_h,stroke=0,fill=1)
            c.setFillColor(HexColor("#0F172A"))
            c.setFont("Helvetica-Bold", 7)
            c.drawString(8, h+footer_h+7, f"Surface Key: {s['surface_key']} | Viewport: {viewport} {w}x{h}")
            c.drawImage(ImageReader(str(img)), 0, footer_h, width=w, height=h, preserveAspectRatio=False, mask=None)
            c.setFillColor(HexColor("#0F172A"))
            c.setFont("Helvetica", 5.6)
            c.drawString(8, 8, f"PNG SHA-256: {shot['sha256']}")
            c.showPage()
            reader_pages[viewport].append({
                "page": i, "surface_key": s["surface_key"], "viewport": viewport, "width": w, "height": h,
                "artifact": shot["artifact"], "png_sha256": shot["sha256"],
            })
        c.save()
        pdf = PdfReader(str(path))
        if len(pdf.pages) != 65:
            raise RuntimeError(f"{viewport} review PDF page count mismatch: {len(pdf.pages)}")
        for pageno, s in enumerate(surfaces):
            text = pdf.pages[pageno].extract_text() or ""
            expected = by_key[s["surface_key"]]["screenshots"][viewport]["sha256"]
            if s["surface_key"] not in text or expected not in text or viewport not in text:
                raise RuntimeError(f"{viewport} review PDF page {pageno+1} failed machine-visible key/hash check for {s['surface_key']}")
        pdf_meta[viewport] = {"path": path.name, "sha256": sha256(path.read_bytes()), "page_count": len(pdf.pages), "page_size_points": [float(pdf.pages[0].mediabox.width), float(pdf.pages[0].mediabox.height)]}
    return reader_pages,pdf_meta

def file_inventory(root, exclude):
    records=[]
    for p in sorted(root.rglob("*")):
        if p.is_file() and p.relative_to(root).as_posix() not in exclude:
            data=p.read_bytes()
            records.append({"path":p.relative_to(root).as_posix(),"bytes":len(data),"sha256":sha256(data)})
    return records

def run_stress(browser, surfaces, recipes):
    by_key = {s["surface_key"]: s for s in surfaces}
    recipes_by_key = {r["surface_key"]: r for r in recipes}
    report = {
        "schema":"project-os-visual-atlas-stress-holdout-v1",
        "canonical_surface_keys_created": 0,
        "noncanonical_stress_only": True,
        "scenarios": [],
        "observed_failure_classes": [],
        "known_noncanonical_obligations_not_captured": ["chores-bulk-selection","family-meal-voting"],
        "notes": ["Stress screenshot hashes are for transient in-memory PNGs; no stress images are added to screenshots/ and no new Surface Keys are created."],
    }
    reps = ["home-dashboard","settings-personal-info","family-member-create","chores-create","chores-today-all"]
    variants = [
        ("360x800-mobile",360,800),
        ("844x390-landscape",844,390),
        ("200-percent-effective-css-reflow",720,450),
        ("holdout-1536x864",1536,864),
        ("holdout-414x896",414,896),
    ]
    for key in reps:
        rec = stress_run_recipe(browser, by_key[key], recipes_by_key[key], "viewport_representative")
        rec["_ready_value"] = recipes_by_key[key]["ready_assertion"]["value"]
        for name,w,h in variants:
            report["scenarios"].append(inspect_stress_viewport(rec,name,w,h))
        if rec.get("context"):
            rec["context"].close()
    reduced_reps = ["home-dashboard","settings-personal-info","family-member-create","chores-create","chores-today-all"]
    for key in reduced_reps:
        rec = stress_run_recipe(browser,by_key[key],recipes_by_key[key],"reduced-motion",reduced_motion="reduce")
        rec["_ready_value"] = recipes_by_key[key]["ready_assertion"]["value"]
        page = rec.get("page")
        if page:
            report["scenarios"].append(inspect_stress_viewport(rec,"reduced-motion",390,844))
        else:
            report["scenarios"].append({"surface_key":key,"variant":"reduced-motion","failure_classes":[f["class"] for f in rec["failures"]],"failures":rec["failures"]})
        if rec.get("context"):
            rec["context"].close()
    dark_reps = [
        "home-dashboard","chores-today-all","family-hub","wallet-points","market-catalog","restock-inventory",
        "family-member-create","family-member-editor","wallet-goal-contribute","market-item-edit","chores-create","settings-personal-info",
    ]
    for key in dark_reps:
        rec = stress_run_recipe(browser,by_key[key],recipes_by_key[key],"dark-mode",color_scheme="dark")
        rec["_ready_value"] = recipes_by_key[key]["ready_assertion"]["value"]
        page = rec.get("page")
        if page:
            report["scenarios"].append(inspect_stress_viewport(rec,"dark-mode",390,844))
        else:
            report["scenarios"].append({"surface_key":key,"variant":"dark-mode","failure_classes":[f["class"] for f in rec["failures"]],"failures":rec["failures"]})
        if rec.get("context"):
            rec["context"].close()
    report["observed_failure_classes"] = sorted({failure for item in report["scenarios"] for failure in item.get("failure_classes",[])})
    report["failure_instances"] = [item for item in report["scenarios"] if item.get("failure_classes")]
    return report

def source_runtime_inventory(surfaces, browser_version):
    source_files = sorted({f for s in surfaces for f in s.get("source_files",[])})
    file_records = []
    for name in source_files:
        content = gitshow(EXPECTED_SOURCE_SHA,name)
        file_records.append({"path":name,"bytes":len(content),"sha256":sha256(content)})
    package_bytes=gitshow(EXPECTED_SOURCE_SHA,"package.json")
    lock_bytes=gitshow(EXPECTED_SOURCE_SHA,"package-lock.json")
    return {
        "schema":"project-os-source-runtime-inventory-v1",
        "product_source":{"sha":EXPECTED_SOURCE_SHA,"tree":EXPECTED_SOURCE_TREE,"branch":"codex/homehuddle-ui0-atlas-capture-v1","source_files":file_records},
        "runtime":{
            "web_origin":ORIGIN,"runtime":"Expo Web, exact committed Product source","browser":"Chromium","browser_version":browser_version,
            "playwright_python_version":importlib.metadata.version("playwright"),"python_version":sys.version.split()[0],
            "node_version":subprocess.check_output(["rtk","proxy","node","--version"],cwd=ROOT,text=True).strip(),
            "npm_version":subprocess.check_output(["rtk","npm","--version"],cwd=ROOT,text=True).strip(),
            "expo_version":"~54.0.33","package_json_sha256":sha256(package_bytes),"package_lock_sha256":sha256(lock_bytes),
            "environment":{"EXPO_NO_DOTENV":"1","EXPO_PUBLIC_SUPABASE_URL":"http://127.0.0.1:54321","EXPO_PUBLIC_SUPABASE_ANON_KEY":"synthetic non-secret local placeholder","production_credentials_present":False,"hosted_household_data_used":False},
            "browser_context":{"locale":"en-US","timezone":"America/Chicago","device_scale_factor":1,"canonical_theme":"light default"},
        },
    }

def main():
    RUN.mkdir(parents=True,exist_ok=True)
    ATLAS.mkdir(parents=True,exist_ok=True)
    SCREEN_DIR.mkdir(parents=True,exist_ok=True)
    carrier_tree = rtk_git("rev-parse",f"{CARRIER_COMMIT}^{{tree}}").strip()
    if carrier_tree != EXPECTED_CARRIER_TREE:
        raise RuntimeError(f"R5 carrier tree mismatch: {carrier_tree}")
    manifest_bytes = gitshow(CARRIER_COMMIT,SURFACE_PATH)
    manifest_sha = sha256(manifest_bytes)
    if manifest_sha != EXPECTED_MANIFEST_SHA:
        raise RuntimeError(f"R5 manifest SHA-256 mismatch: {manifest_sha}")
    manifest = json.loads(manifest_bytes)
    recipes_doc = json.loads(gitshow(CARRIER_COMMIT,RECIPES_PATH))
    surfaces = manifest["surfaces"]
    recipes = recipes_doc["recipes"]
    by_key = {r["surface_key"]:r for r in recipes}
    if len(surfaces) != 65 or len(by_key) != 65 or len({s["surface_key"] for s in surfaces}) != 65:
        raise RuntimeError("accepted 65 surface/recipe uniqueness check failed")
    if set(by_key) != {s["surface_key"] for s in surfaces}:
        raise RuntimeError("R5 recipe key set does not exactly match the manifest")
    if any(s.get("capture_recipe_id") != s["surface_key"] or s["capture_recipe_id"] not in by_key for s in surfaces):
        raise RuntimeError("R5 capture_recipe_id to exact carrier recipe binding failed")
    if any(not by_key[s["surface_key"]]["ready_assertion"].get("runtime_observed") for s in surfaces):
        raise RuntimeError("R5 contains a recipe without runtime-observed ready assertion")
    artifact_paths = [s["canonical"][v]["artifact"] for s in surfaces for v in ("desktop","mobile")]
    if len(artifact_paths) != 130 or len(set(artifact_paths)) != 130:
        raise RuntimeError("accepted artifact path count or uniqueness check failed")
    counts = collections.Counter(s["validation_classification"] for s in surfaces)
    if counts != {"A":57,"B":8}:
        raise RuntimeError(f"accepted classification counts mismatch: {counts}")
    (ATLAS/"surface-manifest.json").write_bytes(manifest_bytes)
    print(json.dumps({"preflight":"passed","carrier_commit":CARRIER_COMMIT,"carrier_tree":carrier_tree,"manifest_sha256":manifest_sha,"surface_count":len(surfaces),"recipe_count":len(recipes),"classification_counts":dict(counts),"artifact_path_count":len(artifact_paths)}),flush=True)

    source_head = rtk_git("rev-parse","HEAD").strip()
    source_tree = rtk_git("rev-parse","HEAD^{tree}").strip()
    status = rtk_git("status","--porcelain=v1","--untracked-files=no").strip()
    remote_main = rtk_git("rev-parse","origin/main").strip()
    remote_tree = rtk_git("rev-parse","origin/main^{tree}").strip()
    if (source_head,source_tree,remote_main,remote_tree) != (EXPECTED_SOURCE_SHA,EXPECTED_SOURCE_TREE,EXPECTED_SOURCE_SHA,EXPECTED_SOURCE_TREE) or status not in ("", "ok"):
        raise RuntimeError(f"bound Product source pre-capture check failed: {(source_head,source_tree,remote_main,remote_tree,status)}")

    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for index,surface in enumerate(surfaces,start=1):
            SURFACE_RESULTS.append(process_surface(browser,surface,by_key[surface["surface_key"]],index))
        canonical_events = list(ALL_EVENTS)
        route_warnings = []
        server_log = RUN/"runtime-server.log"
        if server_log.exists():
            for line in server_log.read_text(encoding="utf-8",errors="replace").splitlines():
                if re.search(r"route|router",line,re.I) and re.search(r"warn|warning|error",line,re.I):
                    route_warnings.append({"timestamp_utc":utcnow(),"type":"route_warning","text":line[:3000],"associated_surface_keys":[r["surface_key"] for r in SURFACE_RESULTS if r["route"].split("?")[0] in line or line.strip() in r["route"]]})
        if FAILED_KEYS:
            failure_report={
                "schema":"project-os-visual-atlas-capture-failure-v1","error_code":"CAPTURE_RECIPE_FAILED",
                "request":"homehuddle-ui0-atlas-capture-v1","operation":"VERIFY","project":"homehuddle",
                "source_sha":EXPECTED_SOURCE_SHA,"tree_sha":EXPECTED_SOURCE_TREE,"manifest_sha256":manifest_sha,
                "surface_count":65,"failed_surface_keys":FAILED_KEYS,"sweep_attempted_surface_keys":[r["surface_key"] for r in SURFACE_RESULTS],
                "capture_results":SURFACE_RESULTS,"manifest_mutation_count":0,"product_source_changed":False,
                "created_at_utc":utcnow(),
            }
            write_json(ATLAS/"capture-report.json",failure_report)
            write_json(ATLAS/"runtime-console-network.json",{"events":canonical_events,"route_warnings":route_warnings,"server_log_path":str(server_log)})
            print(json.dumps({"result":"CAPTURE_RECIPE_FAILED","failed_surface_keys":FAILED_KEYS,"safe_sweep_count":len(SURFACE_RESULTS),"canonical_pngs_written":sum(len(r["screenshots"]) for r in SURFACE_RESULTS)}),flush=True)
            browser.close()
            return 2

        stress=run_stress(browser,surfaces,recipes)
        browser.close()

    # Validate canonical image files before producing reader/package artifacts.
    seen_pairs=[]
    png_inventory=[]
    for surface in surfaces:
        row=next(r for r in SURFACE_RESULTS if r["surface_key"]==surface["surface_key"])
        for viewport in ("desktop","mobile"):
            shot=row["screenshots"].get(viewport)
            if not shot or not shot.get("passed"):
                FAILED_KEYS.append(surface["surface_key"])
                continue
            path=ATLAS/shot["artifact"]
            data=path.read_bytes()
            with Image.open(io.BytesIO(data)) as im:
                dim=list(im.size)
            expected=list(WIDTHS[viewport])
            if dim!=expected or sha256(data)!=shot["sha256"] or data[:8]!=b"\x89PNG\r\n\x1a\n":
                FAILED_KEYS.append(surface["surface_key"])
            seen_pairs.append((surface["surface_key"],viewport))
            png_inventory.append({"surface_key":surface["surface_key"],"viewport":viewport,"artifact":shot["artifact"],"dimensions":dim,"sha256":sha256(data)})
    if len(seen_pairs)!=130 or len(set(seen_pairs))!=130 or len(list(SCREEN_DIR.glob("*.png")))!=130:
        FAILED_KEYS.extend(s["surface_key"] for s in surfaces if len(next(r for r in SURFACE_RESULTS if r["surface_key"]==s["surface_key"])["screenshots"])!=2)
    if FAILED_KEYS:
        write_json(ATLAS/"capture-report.json",{"schema":"project-os-visual-atlas-capture-failure-v1","error_code":"CAPTURE_RECIPE_FAILED","failed_surface_keys":sorted(set(FAILED_KEYS)),"capture_results":SURFACE_RESULTS,"manifest_sha256":manifest_sha,"created_at_utc":utcnow()})
        write_json(ATLAS/"runtime-console-network.json",{"events":ALL_EVENTS,"route_warnings":route_warnings})
        print(json.dumps({"result":"CAPTURE_RECIPE_FAILED","failed_surface_keys":sorted(set(FAILED_KEYS)),"safe_sweep_count":len(SURFACE_RESULTS)}),flush=True)
        return 2

    reader_pages,pdf_meta=make_reader_pdfs(surfaces,SURFACE_RESULTS)
    write_json(ATLAS/"reader-index.json",{"schema":"project-os-visual-atlas-reader-index-v1","surface_count":65,"pages":reader_pages})
    write_json(ATLAS/"runtime-console-network.json",{"schema":"project-os-visual-atlas-runtime-console-network-v1","events":ALL_EVENTS,"route_warnings":route_warnings,"server_log_path":str(RUN/"runtime-server.log")})
    stress["observed_failure_classes"] = sorted(set(stress.get("observed_failure_classes",[])))
    write_json(ATLAS/"stress-holdout-report.json",stress)

    inv=source_runtime_inventory(surfaces,browser.version)
    write_json(ATLAS/"source-runtime-inventory.json",inv)
    capture_authority={
        "schema":"project-os-visual-atlas-capture-authority-v2",
        "project":"homehuddle","change":"CHG-238 R6","repository":"kimhw8084/homehuddle","alias":"app",
        "request":"homehuddle-ui0-atlas-capture-v1","operation":"VERIFY",
        "product_source":{"sha":EXPECTED_SOURCE_SHA,"tree":EXPECTED_SOURCE_TREE,"registered_target":"main"},
        "r5_artifact_carrier":{"ref":"refs/heads/project-os-artifacts/homehuddle/homehuddle-ui0-manifest-validate-v1","commit":CARRIER_COMMIT,"tree":EXPECTED_CARRIER_TREE,"manifest_path":SURFACE_PATH,"manifest_sha256":manifest_sha},
        "independent_audit_authority":{"artifact_run":"AR-85","role":"independently Audit accepted R5 manifest-validation package","locator_only":True,"runner_accessed_notion":False},
        "surface_count":65,"screenshot_count":130,"manifest_mutation_count":0,
        "canonical_spec":{"desktop":{"width":1440,"height":900,"device_scale_factor":1},"mobile":{"width":390,"height":844,"device_scale_factor":1},"locale":"en-US","timezone":"America/Chicago","theme":"light default","fullPage":False,"png":"lossless"},
        "fixture":{"kind":"local-development-seeded-mock","supabase_url":"http://127.0.0.1:54321","anon_key_kind":"synthetic non-secret local placeholder","household_truth":False},
        "created_at_utc":utcnow(),
    }
    write_json(ATLAS/"capture-authority.json",capture_authority)
    # Complete capture report after PDFs and stress evidence exist.
    all_keys=[r["surface_key"] for r in SURFACE_RESULTS]
    ready_ok=all(r["ready_before_capture"].get("passed") and all(r["screenshots"][v]["ready_before"].get("passed") and r["screenshots"][v]["ready_after"].get("passed") for v in ("desktop","mobile")) for r in SURFACE_RESULTS)
    report={
        "schema":"project-os-visual-atlas-capture-report-v2","status":"CAPTURED_PENDING_PACKAGE_VALIDATION",
        "request":"homehuddle-ui0-atlas-capture-v1","operation":"VERIFY","project":"homehuddle",
        "source_sha":EXPECTED_SOURCE_SHA,"source_tree":EXPECTED_SOURCE_TREE,"source_changed":False,
        "r5_artifact_commit":CARRIER_COMMIT,"r5_artifact_tree":EXPECTED_CARRIER_TREE,"manifest_sha256":manifest_sha,"manifest_mutation_count":0,
        "surface_count":65,"unique_surface_key_count":len(set(all_keys)),"screenshot_count":130,"expected_screenshot_count":130,
        "recipe_ready_assertions_all_passed":ready_ok,"failed_surface_keys":[],"artifact_path_collisions":0,
        "runtime_events_total":len(ALL_EVENTS),"route_warning_count":len(route_warnings),
        "canonical_capture_results":SURFACE_RESULTS,"canonical_png_inventory":png_inventory,
        "review_pdfs":pdf_meta,"stress_holdout_failure_classes":stress.get("observed_failure_classes",[]),
        "product_worktree_clean_after_capture":rtk_git("status","--porcelain=v1","--untracked-files=no").strip() in ("","ok"),
        "product_head_after_capture":rtk_git("rev-parse","HEAD").strip(),
        "remote_main_prepublication":{"sha":remote_main,"tree":remote_tree},
        "created_at_utc":utcnow(),
    }
    if not ready_ok or report["product_head_after_capture"]!=EXPECTED_SOURCE_SHA or not report["product_worktree_clean_after_capture"]:
        write_json(ATLAS/"capture-report.json",report)
        raise RuntimeError("prepublication validation failed after canonical capture")
    write_json(ATLAS/"capture-report.json",report)

    # Inventory every package member except this report and the recursive ZIP member.
    prebundle_excluded={"capture-report.json","artifact-bundle.zip"}
    members=file_inventory(ATLAS,prebundle_excluded)
    report["bundle_members"] = members
    report["bundle_member_count"] = len(members)+1
    write_json(ATLAS/"capture-report.json",report)
    bundle=ATLAS/"artifact-bundle.zip"
    with zipfile.ZipFile(bundle,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(ATLAS.rglob("*")):
            if path.is_file() and path != bundle:
                z.write(path,path.relative_to(ATLAS).as_posix())
    with zipfile.ZipFile(bundle,"r") as z:
        bad=z.testzip()
        expected=set(p.relative_to(ATLAS).as_posix() for p in ATLAS.rglob("*") if p.is_file() and p!=bundle)
        actual=set(z.namelist())
        if bad or actual!=expected:
            raise RuntimeError(f"artifact bundle inventory mismatch: bad={bad}, missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")
        for member in members:
            payload=z.read(member["path"])
            if sha256(payload)!=member["sha256"] or len(payload)!=member["bytes"]:
                raise RuntimeError(f"artifact bundle member integrity mismatch: {member['path']}")
        # The report is in the bundle; its own hash is checked against the exact local report bytes.
        if z.read("capture-report.json") != (ATLAS/"capture-report.json").read_bytes():
            raise RuntimeError("artifact bundle capture report readback mismatch")
    bundle_sha=sha256(bundle.read_bytes())
    bundle_size=bundle.stat().st_size
    # Final package structure and cardinality validation.
    if sha256((ATLAS/"surface-manifest.json").read_bytes())!=EXPECTED_MANIFEST_SHA:
        raise RuntimeError("output manifest bytes changed")
    if len(list(SCREEN_DIR.glob("*.png")))!=130:
        raise RuntimeError("canonical PNG count mismatch at final package validation")
    report["status"]="PACKAGE_VALIDATED"
    # Keep ZIP inventory consistent: capture-report must reflect PACKAGE_VALIDATED in its member copy.
    write_json(ATLAS/"capture-report.json",report)
    # Rebuild zip once from finalized report, then validate every archive member byte/hash against the final directory.
    with zipfile.ZipFile(bundle,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(ATLAS.rglob("*")):
            if path.is_file() and path != bundle:
                z.write(path,path.relative_to(ATLAS).as_posix())
    with zipfile.ZipFile(bundle,"r") as z:
        if z.testzip() is not None:
            raise RuntimeError("final artifact bundle CRC validation failed")
        expected=set(p.relative_to(ATLAS).as_posix() for p in ATLAS.rglob("*") if p.is_file() and p!=bundle)
        if set(z.namelist())!=expected:
            raise RuntimeError("final artifact bundle member set mismatch")
        for name in expected:
            if z.read(name)!=(ATLAS/name).read_bytes():
                raise RuntimeError(f"final artifact bundle differs from package member: {name}")
    bundle_sha=sha256(bundle.read_bytes())
    with zipfile.ZipFile(bundle,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(ATLAS.rglob("*")):
            if path.is_file() and path != bundle:
                z.write(path,path.relative_to(ATLAS).as_posix())
    with zipfile.ZipFile(bundle,"r") as z:
        if z.testzip() is not None:
            raise RuntimeError("final package ZIP CRC failed")
        expected=set(p.relative_to(ATLAS).as_posix() for p in ATLAS.rglob("*") if p.is_file() and p!=bundle)
        if set(z.namelist())!=expected:
            raise RuntimeError("final package ZIP inventory mismatch")
        for name in expected:
            if z.read(name)!=(ATLAS/name).read_bytes():
                raise RuntimeError(f"final package ZIP member mismatch: {name}")
    bundle_sha=sha256(bundle.read_bytes())

    # Package receipt metadata outside the immutable package records final bundle hash.
    write_json(RUN/"package-final-hashes.json",{
        "request":"homehuddle-ui0-atlas-capture-v1","manifest_sha256":manifest_sha,
        "surface_count":65,"screenshot_count":130,"artifact_bundle_sha256":bundle_sha,
        "review_desktop_sha256":pdf_meta["desktop"]["sha256"],"review_mobile_sha256":pdf_meta["mobile"]["sha256"],
        "package_member_count":len(expected),"validated_at_utc":utcnow(),
    })
    print(json.dumps({"result":"CANONICAL_CAPTURE_AND_PACKAGE_VALIDATED","surface_count":65,"screenshot_count":130,"failed_surface_keys":[],"manifest_sha256":manifest_sha,"bundle_sha256":bundle_sha,"review_desktop_sha256":pdf_meta["desktop"]["sha256"],"review_mobile_sha256":pdf_meta["mobile"]["sha256"],"stress_failure_classes":stress.get("observed_failure_classes",[]),"artifact_path":str(ATLAS)},ensure_ascii=False),flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())

