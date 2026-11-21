#!/opt/homebrew/bin/bash
# 打包 macOS .app：swiftc 外壳 + web 资源 + 程序化图标
# 版本号单一来源：VERSION 文件（注入 Info.plist）
set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(tr -d '[:space:]' < VERSION)"
APP="out/GTA VI 绿色纯净版.app"
EXEC="GTA6GreenInstaller"

trap 'rm -rf .tmp' EXIT
rm -rf .tmp "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" .tmp

# 1) 编译外壳
swiftc -O app/App.swift -o "$APP/Contents/MacOS/$EXEC" 2> .tmp/build.log \
  || { cat .tmp/build.log; exit 1; }

# 2) web 资源（web/assets/ 为本地自备封面，不入库，仅本地嵌入）
cp -R web/. "$APP/Contents/Resources/web/"

# 3) Info.plist（版本注入）
sed "s/__VERSION__/$VERSION/g" app/Info.plist > "$APP/Contents/Info.plist"
plutil -lint "$APP/Contents/Info.plist" >/dev/null

# 4) 图标（程序化生成 → iconset → icns）
ICONSET=".tmp/AppIcon.iconset"
mkdir -p "$ICONSET"
swift app/make_icon.swift .tmp/icon_512.png >/dev/null
for s in 16 32 128 256 512; do
  sips -z "$s" "$s" .tmp/icon_512.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
done
sips -z 32 32  .tmp/icon_512.png --out "$ICONSET/icon_16x16@2x.png"  >/dev/null
sips -z 64 64  .tmp/icon_512.png --out "$ICONSET/icon_32x32@2x.png"  >/dev/null
sips -z 256 256 .tmp/icon_512.png --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 512 512 .tmp/icon_512.png --out "$ICONSET/icon_256x256@2x.png" >/dev/null
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

# 5) ad-hoc 签名（本地免 Gatekeeper 告警）
codesign --force --sign - "$APP"

echo "OK: $APP (version $VERSION)"
