# WCAG 2.x contrast audit of index.html: every visible text element, in light and dark mode, across UI states.
# Optional dev tool (not part of the Node build). Needs: python3, playwright (pip install playwright; playwright install chromium).
# Usage: python3 tools/audit-contrast.py [path/to/index.html]   (default: docs/index.html). Exit code 1 if anything fails.
import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
FILE = Path(sys.argv[1] if len(sys.argv) >
            1 else 'docs/index.html').resolve().as_uri()
JS = r"""
()=>{
 const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return{r:0,g:0,b:0,a:0};const v=m[1].split(/[ ,\/]+/).map(parseFloat);return{r:v[0],g:v[1],b:v[2],a:v[3]===undefined||isNaN(v[3])?1:v[3]}};
 const lin=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};
 const L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
 const over=(f,b,a)=>({r:f.r*a+b.r*(1-a),g:f.g*a+b.g*(1-a),b:f.b*a+b.b*(1-a),a:1});
 const bgOf=el=>{const chain=[];for(let e=el;e;e=e.parentElement)chain.unshift(e);
  let cur={r:255,g:255,b:255,a:1};let op=1;
  for(const e of chain){const cs=getComputedStyle(e);const bg=parse(cs.backgroundColor);if(bg.a>0)cur=over(bg,cur,bg.a*parseFloat(cs.opacity));}
  return cur};
 const ratio=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const out=[];const seen=new Set();
 const check=(el,fgStr,label,txt)=>{
  const cs=getComputedStyle(el);let op=1;for(let e=el;e;e=e.parentElement)op*=parseFloat(getComputedStyle(e).opacity);
  const bg=bgOf(el);let fg=parse(fgStr);fg=over(fg,bg,fg.a*op);
  const r=ratio(fg,bg),size=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700,large=size>=24||(size>=18.66&&bold);
  const need=large?3:4.5;if(r>=need)return;
  const key=[el.className,fgStr,Math.round(bg.r),Math.round(bg.g),Math.round(bg.b),op].join('|');if(seen.has(key))return;seen.add(key);
  out.push({sel:(el.tagName.toLowerCase()+(el.className?'.'+String(el.className).trim().replace(/\s+/g,'.'):'')),ratio:+r.toFixed(2),need,fg:`rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,bg:`rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,op,text:txt.slice(0,30),disabled:!!el.disabled});};
 for(const el of document.body.querySelectorAll('*')){
  if(['SCRIPT','STYLE','OPTION'].includes(el.tagName))continue;
  if(el.checkVisibility&&!el.checkVisibility())continue;
  const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
  if(t)check(el,getComputedStyle(el).color,'text',t);
  if(el.tagName==='INPUT'&&el.placeholder&&el.type!=='checkbox')check(el,getComputedStyle(el,'::placeholder').color,'placeholder',el.placeholder);
  if(el.tagName==='SELECT'){check(el,getComputedStyle(el).color,'select',el.options[el.selectedIndex]?.text||'')}
 }
 return out};
"""


def run(scheme, block_storage=False, mode='both'):
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(color_scheme=scheme, viewport={
                            'width': 1500, 'height': 1000})
        pg = ctx.new_page()
        if block_storage:
            pg.add_init_script(
                "Storage.prototype.setItem=function(){throw new Error('x')}")
        pg.goto(FILE)
        if mode == 'no':
            pg.click('#lb button:text-is("NO")')   # Norwegian interface

        def grab(name):
            for r in pg.evaluate(JS):
                res.setdefault((r['sel'], r['fg'], r['bg'], r['op']), {
                               **r, 'states': []})['states'].append(name)
        grab('default')
        if block_storage:
            grab('storage-warning')
            b.close()
            return res
        pg.click('#lb button:text-is("EN")')
        grab('EN')
        pg.click('#lb button:text-is("NO")')
        grab('NO')
        pg.click('#lb button:text-is("NO + EN")' if mode ==
                 'both' else '#lb button:text-is("NO")')
        pg.click('#vb button >> nth=1')
        grab('tree')
        pg.click('#vb button >> nth=0')
        for c in ['BC002', 'BC253', 'BC021', 'BC206']:
            pg.check(f'input.cb[data-k={c}]')
        pg.check('.l1[data-c=BC001] > .t input.cb')
        grab('selected+missing+dirty')
        pg.fill('#q', 'BC02')
        grab('search BC02')
        pg.fill('#q', 'studie')
        grab('search studie')
        pg.fill('#q', '')
        pg.click('#bar button.pri')
        pg.fill('#dn', 'Mål A')
        grab('save dialog')
        pg.click('dialog button.pri')
        pg.wait_for_timeout(200)
        grab('saved state')
        pg.click('.l2[data-c=BC253]')
        grab('detail (missing)')
        pg.click('.l2[data-c=BC002]')
        grab('detail')
        pg.keyboard.press('Escape')
        pg.click('#hs')
        grab('help open')
        pg.keyboard.press('Escape')
        pg.check('input.cb[data-k=BC003]')
        pg.click('#bar button >> nth=2')
        assert 'ontinue' in pg.inner_text(
            'dialog') or 'ortsett' in pg.inner_text('dialog')
        grab('guard dialog')
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(100)
        pg.click('#bar button.danger')
        grab('delete dialog')
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(100)
        b.close()
    return res


if __name__ == '__main__':
    total = 0
    for scheme, bs, mode in [('light', False, 'both'), ('dark', False, 'both'), ('light', False, 'no'), ('dark', False, 'no'), ('light', True, 'both')]:
        res = run(scheme, bs, mode)
        label = f"{scheme}, interface {'Norwegian' if mode == 'no' else 'English'}" + \
            (' (storage blocked)' if bs else '')
        fails = [r for r in res.values() if not r['disabled']]
        total += len(fails)
        print(f'== {label}: {len(fails)} failing combinations')
        for r in sorted(fails, key=lambda r: r['ratio'])[:40]:
            print(f"  {r['ratio']:>5} (<{r['need']})  {r['sel'][:34]:34} fg {r['fg']:16} bg {r['bg']:16} op {r['op']:.2f}  \"{r['text']}\"  [{', '.join(r['states'][:3])}]")
    print('TOTAL failing:', total)
    sys.exit(1 if total else 0)
