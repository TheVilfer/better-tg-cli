#!/usr/bin/env bash
# Rebuild all brand assets: mark SVGs (gen.py) and banner/preview PNGs (headless Chrome, Geist font).
set -euo pipefail
cd "$(dirname "$0")"
python3 gen.py
python3 banners.py
CH="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
shot() { "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$2" --virtual-time-budget=4000 --screenshot="$PWD/$3" "file://$PWD/$1" >/dev/null 2>&1; }
shot banner-dark.html 2560,640 banner-dark.png
shot banner-light.html 2560,640 banner-light.png
shot social.html 1280,640 social-preview.png
rm -f banner-dark.html banner-light.html social.html
# Square avatar/icon
printf '<html><body style="margin:0;background:#000">%s</body></html>' "$(sed 's/width="120" height="120"/width="512" height="512"/' icon.svg)" > icon.html
shot icon.html 512,512 icon-512.png
rm -f icon.html
