"""Bundle the project page into one self-contained HTML file.

usage: python bundle_standalone.py <page_root> <out.html> [--full]
Media go into a per-document base64 map; a small shim turns them into blob URLs
on demand (covers static attributes and paths built in JS). Iframes become srcdoc.
Media no page source mentions are left out. By default videos are re-encoded
(H.264 CRF 32, <=832 px wide) and raster images become WebP; --full keeps originals.
"""
import base64, html, json, mimetypes, re, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
FULL = '--full' in sys.argv
MEDIA = {'.mp4', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}
# every page source, to tell which media are used; paths built in JS are matched by DYNAMIC
SOURCES = '\n'.join(p.read_text() for p in ROOT.rglob('*') if p.suffix in {'.html', '.js', '.css'}
                    and 'vendor' not in p.parts and '(standalone)' not in p.name)
DYNAMIC = re.compile(r'videos/latents/|videos/trained/|images/beta/|videos/xp_')
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}
mimetypes.add_type('font/woff2', '.woff2'); mimetypes.add_type('font/otf', '.otf')


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()


def encode(p):
    """(mime, bytes) for a media file, shrunk unless --full; never larger than the original."""
    mime, raw = mimetypes.guess_type(p.name)[0], p.read_bytes()
    if FULL or p.suffix.lower() not in {'.mp4', '.png', '.jpg', '.jpeg'}:
        return mime, raw
    with tempfile.TemporaryDirectory() as t:
        if p.suffix == '.mp4':
            out, new_mime = Path(t) / 'o.mp4', mime
            cmd = ['ffmpeg', '-v', 'error', '-i', str(p), '-vf', "scale='min(iw,832)':-2", '-c:v', 'libx264',
                   '-preset', 'slow', '-crf', '32', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', str(out)]
        else:
            out, new_mime = Path(t) / 'o.webp', 'image/webp'
            cmd = ['cwebp', '-quiet', '-q', '80', str(p), '-o', str(out)]
        subprocess.run(cmd, check=True)
        b = out.read_bytes()
    return (new_mime, b) if len(b) < len(raw) else (mime, raw)


def used(rel):
    return Path(rel).name in SOURCES or DYNAMIC.search(rel)


def data_uri(b, mime):
    return f'data:{mime};base64,{base64.b64encode(b).decode()}'


def css_inline(css, base=None):
    """Inline url(...) refs (local files relative to base, or absolute http URLs)."""
    def sub(m):
        u = m.group(1).strip('\'"')
        if u.startswith(('data:', '#')):
            return m.group(0)
        if u.startswith('http'):
            return f'url({data_uri(get(u), "font/woff2")})'
        p = (base / u.split('?')[0].split('#')[0]).resolve()
        if not p.exists():
            return m.group(0)  # e.g. fontawesome webfonts that were never shipped
        return f'url({data_uri(p.read_bytes(), mimetypes.guess_type(p.name)[0] or "application/octet-stream")})'
    return re.sub(r'url\(([^)]*)\)', sub, css)


SHIM = r'''(function(){var A=window.__A,C={};
function r(u){if(typeof u!=='string')return u;var k=u.split('?')[0].replace(/^\.\//,'');if(!(k in A))return u;
if(!C[k]){var b=atob(A[k][1]),n=b.length,a=new Uint8Array(n);for(var i=0;i<n;i++)a[i]=b.charCodeAt(i);
C[k]=URL.createObjectURL(new Blob([a],{type:A[k][0]}));}return C[k];}
window.__R=r;
[HTMLMediaElement,HTMLImageElement,HTMLSourceElement].forEach(function(T){var d=Object.getOwnPropertyDescriptor(T.prototype,'src');
Object.defineProperty(T.prototype,'src',{configurable:true,get:function(){return this.__o||d.get.call(this)},set:function(v){this.__o=v;d.set.call(this,r(v))}});});
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n==='src'||n==='poster')v=r(v);return sa.call(this,n,v)};
var f=window.fetch;window.fetch=function(u,o){return f.call(this,r(u),o)};})();'''
HYDRATE = ('<script>document.querySelectorAll("[data-a-src],[data-a-poster]").forEach(function(e){'
           'if(e.dataset.aPoster)e.setAttribute("poster",e.dataset.aPoster);'
           'if(e.dataset.aSrc){e.src=e.dataset.aSrc;if(e.autoplay)e.play&&e.play().catch(function(){})}});</script>')


def script(js):
    return '<script>' + js.replace('</script', '<\\/script') + '</script>'


def build(doc, media_dirs, skip=()):
    d = doc.parent
    src = doc.read_text()
    assets = {}
    for md in media_dirs:
        for p in sorted((d / md).rglob('*')):
            rel = p.relative_to(d).as_posix()
            if p.suffix.lower() in MEDIA and not any(s in p.parts for s in skip) and used(p.relative_to(ROOT).as_posix()):
                mime, b = encode(p)
                assets[rel] = [mime, base64.b64encode(b).decode()]

    # external/preconnect noise and the noscript fallback
    src = re.sub(r'\s*<link rel="preconnect"[^>]*>', '', src)
    src = re.sub(r'\s*<noscript>.*?</noscript>', '', src, flags=re.S)

    def link(m):
        href = re.search(r'href="([^"]+)"', m.group(0)).group(1)
        if href.startswith('http'):
            return '<style>' + css_inline(get(href).decode()) + '</style>'
        p = d / href.split('?')[0]
        return '<style>' + css_inline(p.read_text(), p.parent) + '</style>'
    src = re.sub(r'<link [^>]*(?:rel="stylesheet"|as="style")[^>]*>', link, src)

    # scripts: deferred ones must run after parsing, so they move to the end of <body>
    deferred = []
    def scr(m):
        u = m.group(2)
        js = get(u).decode() if u.startswith('http') else (d / u.split('?')[0]).read_text()
        if m.group(1):
            deferred.append(script(js)); return ''
        return script(js)
    src = re.sub(r'[ \t]*<script (defer )?src="([^"]+)"></script>\n?', scr, src)

    # iframes -> srcdoc
    def ifr(m):
        child = d / m.group(1)
        return 'srcdoc="' + html.escape(build(child, ['.'], skip=('vendor', 'fonts')), quote=True) + '"'
    src = re.sub(r'src="(static/(?:teaser|pipeline)/index\.html)"', ifr, src)

    # static media attributes -> resolved by HYDRATE through the shim
    def attr(m):
        tag = m.group(0)
        return re.sub(r'\b(src|poster)="([^"]+)"',
                      lambda a: f'data-a-{a.group(1)}="{a.group(2)}"' if a.group(2).split('?')[0] in assets else a.group(0), tag)
    src = re.sub(r'<(?:video|img|source)\b[^>]*>', attr, src)

    head = script('window.__A=' + json.dumps(assets) + ';') + script(SHIM)
    src = re.sub(r'(<meta charset="utf-8">)', lambda m: m.group(1) + '\n' + head, src, count=1)
    src = src.replace('</body>', HYDRATE + ''.join(deferred) + '\n</body>', 1)
    return src


if __name__ == '__main__':
    Path(sys.argv[2]).write_text(build(ROOT / 'index.html', ['static/images', 'static/videos']))
    print(sys.argv[2], round(Path(sys.argv[2]).stat().st_size / 1e6, 1), 'MB')
