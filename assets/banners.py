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


def hero(theme, w=2400, h=860):
    """README banner: the wordmark and install line on the left, real CLI output on the right."""
    dark = theme == 'dark'
    bg, fg, dim = ('#000', '#fff', '#8a8a8a') if dark else ('#fff', '#000', '#6b6b6b')
    term_bg, term_bd, term_fg, term_dim = ('#0b0b0b', '#262626', '#ededed', '#7a7a7a') if dark else ('#fafafa', '#e4e4e4', '#161616', '#8a8a8a')
    blue, green = '#2AABEE', ('#3fb950' if dark else '#1a7f37')
    lines = ''.join(f'<rect x="{x}" y="0" width="2" height="{h}"/>' for x in range(0, w, 16))
    P = f'<span style="color:{term_dim}">$</span> '
    D = lambda t: f'<span style="color:{term_dim}">{t}</span>'
    B = lambda t: f'<span style="color:{blue}">{t}</span>'
    G = lambda t: f'<span style="color:{green}">{t}</span>'
    term = '<br>'.join([
        P + 'telegram inbox -n 3',
        D('48 unread in 7 chats (showing 3)'),
        D('1234567890') + ' user ' + B('unread=2') + ' Alice @alice ' + D('|') + ' see you at 7?',
        D('-1001234567') + ' supergroup muted ' + B('unread=41') + ' Rust Seattle ' + D('|') + ' anyone tried 1.90?',
        D('-1009876543') + ' channel ' + B('unread=5') + ' Changelog ' + D('|') + ' v2.4 is out',
        '&nbsp;',
        P + 'telegram write-access on --for 1h',
        G('Write access enabled until 21:40.'),
        P + 'telegram send @alice "on my way"',
        G('✔ Message sent'),
        D('Message ID: 813'),
    ])
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=Geist+Mono:wght@400&display=block" rel="stylesheet">
<style>
html,body{{margin:0;background:{bg}}}
.b{{position:relative;width:{w}px;height:{h}px;overflow:hidden;background:{bg};font-family:Geist,sans-serif;color:{fg}}}
.g{{position:absolute;inset:0;opacity:{0.13 if dark else 0.07};
  -webkit-mask-image:radial-gradient(ellipse 70% 90% at 72% 50%,#000 0%,transparent 75%)}}
.l{{position:absolute;left:150px;top:0;bottom:0;width:820px;display:flex;flex-direction:column;justify-content:center;gap:44px}}
.row{{display:flex;align-items:center;gap:30px}}
.w{{font-size:76px;font-weight:300;letter-spacing:2px;line-height:1}}
.w i{{font-style:normal;color:{blue}}}
.t{{font-size:50px;font-weight:400;letter-spacing:-0.8px;line-height:1.15}}
.f{{font-size:30px;color:{dim};letter-spacing:0.2px}}
.i{{align-self:flex-start;font-family:'Geist Mono',monospace;font-size:28px;padding:18px 26px;border:1.5px solid {term_bd};border-radius:12px;background:{term_bg};color:{term_fg}}}
.i span{{color:{term_dim}}}
.term{{position:absolute;right:130px;top:50%;transform:translateY(-50%);width:1180px;border:1.5px solid {term_bd};border-radius:18px;background:{term_bg};
  box-shadow:0 40px 120px rgba(0,0,0,{0.6 if dark else 0.10})}}
.bar{{height:58px;border-bottom:1.5px solid {term_bd};display:flex;align-items:center;gap:14px;padding:0 24px}}
.bar i{{width:16px;height:16px;border-radius:50%;background:{term_bd}}}
.bar b{{margin-left:auto;margin-right:auto;transform:translateX(-40px);font:400 22px 'Geist Mono',monospace;color:{term_dim}}}
.out{{padding:34px 40px 40px;font-family:'Geist Mono',monospace;font-size:25.5px;line-height:1.62;color:{term_fg};white-space:nowrap}}
</style></head><body><div class="b">
<svg class="g" width="{w}" height="{h}" fill="{fg}">{lines}</svg>
<div class="l">
  <div class="row"><svg width="78" height="78" viewBox="0 0 {N*C} {N*C}" shape-rendering="crispEdges">{mark(fg)}</svg>
  <div class="w">BETTER-TG-CLI<i>.</i></div></div>
  <div class="t">Telegram for your terminal<br>and your AI agents</div>
  <div class="f">Your own account · bots · MCP · read-only by default</div>
  <div class="i"><span>$</span> brew install thevilfer/tap/better-tg-cli</div>
</div>
<div class="term"><div class="bar"><i></i><i></i><i></i><b>telegram</b></div><div class="out">{term}</div></div>
</div></body></html>'''

if __name__ == '__main__':
    for t in ('dark', 'light'):
        open(f'banner-{t}.html', 'w').write(hero(t))
    open('social.html', 'w').write(banner('dark', 1280, 640, 64, 34, 60, 56))
