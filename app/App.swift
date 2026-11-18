/* GTA VI 绿色纯净版 —— macOS 无边框外壳
 * 职责：1280×720 无边框窗口 + WKWebView 加载本地页面 + Esc 退出
 * 页面本体在 Resources/web/（index.html + style.css + installer.js + game.js）
 */
import Cocoa
import WebKit

/* 无边框窗口默认不能成为 key window，键盘事件就进不了页面；这里放行 */
final class GameWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler {
    var window: GameWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ note: Notification) {
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "bridge")

        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1280, height: 720),
                            configuration: config)
        webView.underPageBackgroundColor = .black

        window = GameWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 720),
                            styleMask: [.borderless, .fullScreen],
                            backing: .buffered, defer: false)
        window.title = "GTA VI 绿色纯净版"
        window.contentView = webView
        window.center()

        if let res = Bundle.main.resourceURL {
            let html = res.appendingPathComponent("web/index.html")
            webView.loadFileURL(html, allowingReadAccessTo: res)
        }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        /* Esc = 退出应用（保底出口，README 有说明） */
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { e in
            if e.keyCode == 53 { NSApp.terminate(nil); return nil }
            return e
        }
    }

    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "bridge", let cmd = message.body as? String else { return }
        switch cmd {
        case "quit": NSApp.terminate(nil)
        case "fullscreen": window.toggleFullScreen(nil)
        default: break
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
