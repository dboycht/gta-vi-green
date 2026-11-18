/* 生成应用图标：日落渐变 + 太阳 + 斜体 VI（程序化，无外部素材）
 * 用法：swift make_icon.swift <输出 png 路径>
 */
import Cocoa

let size = 512
guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
                                 bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                                 isPlanar: false, colorSpaceName: .deviceRGB,
                                 bytesPerRow: 0, bitsPerPixel: 0),
      let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
    fatalError("bitmap context failed")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx

let path = NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: size, height: size),
                        xRadius: 96, yRadius: 96)
path.addClip()
let grad = NSGradient(starting: NSColor(srgbRed: 0.12, green: 0.08, blue: 0.28, alpha: 1),
                      ending: NSColor(srgbRed: 1.0, green: 0.62, blue: 0.36, alpha: 1))!
grad.draw(in: NSRect(x: 0, y: 0, width: size, height: size), angle: -75)

let sun = NSBezierPath(ovalIn: NSRect(x: size / 2 - 105, y: 60, width: 210, height: 210))
NSColor(srgbRed: 1.0, green: 0.84, blue: 0.42, alpha: 0.85).setFill()
sun.fill()

let para = NSMutableParagraphStyle()
para.alignment = .center
let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 230, weight: .black),
    .foregroundColor: NSColor.white,
    .paragraphStyle: para,
    .obliqueness: 0.18,
]
let str = NSAttributedString(string: "VI", attributes: attrs)
let ts = str.size()
let tx: CGFloat = (CGFloat(size) - ts.width) / 2
let ty: CGFloat = (CGFloat(size) - ts.height) / 2 + 30
str.draw(at: NSPoint(x: tx, y: ty))
NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
    fatalError("png encode failed")
}
let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon_512x512.png"
try png.write(to: URL(fileURLWithPath: out))
print("icon written: \(out)")
