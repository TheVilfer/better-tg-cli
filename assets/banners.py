"""Banner and social-preview HTML in the better-auth style: mono, thin grid, one accent."""
from gen import mark, N, C

def banner(theme, w, h, word, tag, ms, gap):
    dark = theme == 'dark'
    bg, fg = ('#000', '#fff') if dark else ('#fff', '#000')
    lines = ''.join(f'<rect x="{x}" y="0" width="2" height="{h}"/>' for x in range(int(w * 0.58), w, 14))
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400&display=block" rel="stylesheet">
<style>
html,body{{margin:0;background:{bg}}}
.b{{position:relative;width:{w}px;height:{h}px;overflow:hidden;background:{bg};font-family:Geist,sans-serif;color:{fg}}}
.g{{position:absolute;inset:0;opacity:{0.16 if dark else 0.09};
  -webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 55%),linear-gradient(0deg,transparent,#000 30%,#000 70%,transparent);
  -webkit-mask-composite:source-in}}
.c{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{gap}px}}
.row{{display:flex;align-items:center;gap:{ms*0.4:.0f}px}}
.w{{font-size:{word}px;font-weight:300;letter-spacing:2px;line-height:1}}
.w i{{font-style:normal;color:#2AABEE}}
.t{{font-size:{tag}px;font-weight:400;letter-spacing:-0.5px}}
</style></head><body><div class="b">
<svg class="g" width="{w}" height="{h}" fill="{fg}">{lines}</svg>
<div class="c"><div class="row">
<svg width="{ms}" height="{ms}" viewBox="0 0 {N*C} {N*C}" shape-rendering="crispEdges">{mark(fg)}</svg>
<div class="w">BETTER-TG-CLI<i>.</i></div></div>
<div class="t">Telegram for your terminal and your AI agents</div></div></div></body></html>'''

if __name__ == '__main__':
    for t in ('dark', 'light'):
        open(f'banner-{t}.html', 'w').write(banner(t, 2560, 640, 92, 64, 84, 92))
    open('social.html', 'w').write(banner('dark', 1280, 640, 64, 34, 60, 56))
