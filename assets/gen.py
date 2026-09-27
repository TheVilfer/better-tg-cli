"""Generates the better-tg-cli mark: a black block with a '>_' prompt cut out of it.
'▶' reads as both a shell prompt and Telegram's 'send' arrow; the cursor carries Telegram's blue."""
C = 10                     # cell size
N = 7                      # grid is N x N cells
# A stepped '▶' (send arrow and shell prompt) cut out of the block, (col,row)
CUT = {(1,1),(1,2),(2,2),(1,3),(2,3),(3,3),(1,4),(2,4),(1,5)}
CURSOR = {(3,5),(4,5),(5,5)}               # the '_' cursor
BLUE = '#2AABEE'

def mark(fg='#000', bg=None, x=0, y=0, scale=1.0):
    s = C*scale
    parts = []
    # Outline the block as rows of runs so cut cells stay transparent
    for r in range(N):
        c = 0
        while c < N:
            if (c,r) in CUT or (c,r) in CURSOR:
                c += 1; continue
            start = c
            while c < N and (c,r) not in CUT and (c,r) not in CURSOR: c += 1
            parts.append(f'<rect x="{x+start*s:g}" y="{y+r*s:g}" width="{(c-start)*s:g}" height="{s:g}" fill="{fg}"/>')
    cs = sorted(CURSOR)
    parts.append(f'<rect x="{x+cs[0][0]*s:g}" y="{y+cs[0][1]*s:g}" width="{len(cs)*s:g}" height="{s:g}" fill="{BLUE}"/>')
    return '\n'.join(parts)

def svg(fg, size=N*C, pad=0, bg=None):
    total = size + 2*pad
    back = f'<rect width="{total}" height="{total}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" width="{total}" height="{total}" shape-rendering="crispEdges">'
            f'{back}{mark(fg, x=pad, y=pad, scale=size/(N*C))}</svg>\n')

if __name__ == '__main__':
    open('mark.svg','w').write(svg('#000'))
    open('mark-white.svg','w').write(svg('#fff'))
    # App/avatar icon: white mark on black, padded
    open('icon.svg','w').write(svg('#fff', size=70, pad=25, bg='#000'))
