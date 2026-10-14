import AppKit
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var window: NSWindow?
    private var backend: Process?
    private var webView: WKWebView?
    private var address = "http://127.0.0.1:3000"
    private var launch: [String: Any] = [:]
    private var attempts = 0
    private var launched = false
    private var countryOpenings = Set<String>()

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let iconURL = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
           let icon = NSImage(contentsOf: iconURL) { NSApp.applicationIconImage = icon }
        if let path = Bundle.main.url(forResource: "launch", withExtension: "json"),
           let data = try? Data(contentsOf: path), let config = try? JSONSerialization.jsonObject(with: data) as? [String: Any] { launch = config }
        if let port = launch["port"] as? Int { address = "http://127.0.0.1:\(port)" }
        if let arg = CommandLine.arguments.dropFirst().first, arg.hasPrefix("http://") { address = arg }
        let menu = NSMenu()
        let appMenu = NSMenuItem(); menu.addItem(appMenu)
        let submenu = NSMenu()
        let refresh = submenu.addItem(withTitle: "Refresh admin", action: #selector(refreshAdmin), keyEquivalent: "r"); refresh.target = self
        submenu.addItem(.separator())
        submenu.addItem(withTitle: "Quit Sportsbook Collector", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"); appMenu.submenu = submenu
        let edit = NSMenuItem(title: "Edit", action: nil, keyEquivalent: ""); menu.addItem(edit)
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Copy", action: Selector(("copy:")), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: Selector(("paste:")), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: Selector(("selectAll:")), keyEquivalent: "a")
        edit.submenu = editMenu; NSApp.mainMenu = menu
        let frame = NSScreen.main?.visibleFrame ?? NSRect(x:0,y:0,width:1440,height:900)
        let win = NSWindow(contentRect:NSRect(x:0,y:0,width:min(1440,frame.width-30),height:min(920,frame.height-30)),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
        win.title = Bundle.main.object(forInfoDictionaryKey:"CFBundleName") as? String ?? "Sportsbook Collector"; win.minSize=NSSize(width:760,height:560); win.center()
        window=win; showMessage("Starting Sportsbook Collector…")
        win.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps:true)
        connect()
    }
    private func showMessage(_ text: String) {
        let label = NSTextField(wrappingLabelWithString:text); label.alignment = .center
        label.frame=NSRect(x:30,y:100,width:650,height:120)
        let view=NSView(frame:window?.contentView?.bounds ?? .zero); view.addSubview(label); window?.contentView=view
    }
    private func nativeRequest() -> URLRequest {
        var request = URLRequest(url: URL(string: address)!)
        if let root = launch["root"] as? String,
           let data = try? Data(contentsOf: URL(fileURLWithPath: root).appendingPathComponent(".engine/ui/native-access.json")),
           let config = try? JSONSerialization.jsonObject(with: data) as? [String: String], let token = config["token"] {
            request.setValue(token, forHTTPHeaderField: "X-Collector-App")
        }
        return request
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let allowed = URL(string: address), url.scheme == allowed.scheme, url.host == allowed.host, url.port == allowed.port else { decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    private func connect() {
        guard let url=URL(string:address+"/api/health") else {return}
        var request=URLRequest(url:url);request.timeoutInterval=1
        URLSession.shared.dataTask(with:request){[weak self] _,response,error in
            DispatchQueue.main.async {
                guard let self=self else{return}
                if error == nil, (response as? HTTPURLResponse)?.statusCode == 200 {
                    let configuration=WKWebViewConfiguration()
                    configuration.userContentController.add(self, name:"countryExpress")
                    let web=WKWebView(frame:self.window?.contentView?.bounds ?? .zero, configuration:configuration)
                    web.autoresizingMask=[.width,.height];self.window?.contentView=web;self.webView=web
                    web.navigationDelegate = self
                    web.load(self.nativeRequest());return
                }
                if !self.launched {
                    self.launched=true
                    guard let node=self.launch["node"] as? String,let root=self.launch["root"] as? String else {self.showMessage("Launch configuration is missing. Run npm run ui once from the project.");return}
                    let process=Process();process.executableURL=URL(fileURLWithPath:node);process.currentDirectoryURL=URL(fileURLWithPath:root)
                    process.arguments=[root+"/node_modules/tsx/dist/cli.mjs",root+"/src/ui/main.ts","--server-only","--port",String(URLComponents(string:self.address)?.port ?? 3000)]
                    process.standardInput=FileHandle.nullDevice
                    let logURL=URL(fileURLWithPath:root).appendingPathComponent(".engine/ui/app.log")
                    try? FileManager.default.createDirectory(at:logURL.deletingLastPathComponent(),withIntermediateDirectories:true)
                    if !FileManager.default.fileExists(atPath:logURL.path) {FileManager.default.createFile(atPath:logURL.path,contents:nil)}
                    if let output=try? FileHandle(forWritingTo:logURL) {output.seekToEndOfFile();process.standardOutput=output;process.standardError=output}
                    var environment=ProcessInfo.processInfo.environment
                    environment["PATH"]=URL(fileURLWithPath:node).deletingLastPathComponent().path+":"+(environment["PATH"] ?? "/usr/bin:/bin")
                    process.environment=environment
                    do {try process.run();self.backend=process} catch {self.showMessage("Could not start the local server: \(error.localizedDescription)");return}
                }
                self.attempts+=1
                if let process=self.backend, !process.isRunning {self.showMessage("The local server exited with status \(process.terminationStatus). Run npm run ui from the project to see its error.");return}
                if self.attempts == 50 {self.showMessage("Waiting for the local server. If macOS asks for Desktop folder access, allow access so this app can read the project and its real data.")}
                DispatchQueue.main.asyncAfter(deadline:.now()+0.2){self.connect()}
            }
        }.resume()
    }
    // Opening tabs is independent of an active acquisition. Accept only a country
    // from our authenticated local main frame; never arbitrary URLs or programs.
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "countryExpress", message.frameInfo.isMainFrame,
              let origin=message.frameInfo.request.url, let allowed=URL(string:address),
              origin.scheme == allowed.scheme, origin.host == allowed.host, origin.port == allowed.port,
              let body=message.body as? [String:String], let id=body["id"], id.count <= 80,
              id.range(of:"^[a-zA-Z0-9-]+$",options:.regularExpression) != nil,
              let country=body["country"], ["mx","co","pe","br","ke","ng","in","uk","global","gl"].contains(country),
              let resources=Bundle.main.resourceURL,
              let node=launch["node"] as? String else { return }
        if countryOpenings.contains(country) { countryOpened(id:id,error:"Las páginas de este país ya se están abriendo.");return }
        countryOpenings.insert(country)
        DispatchQueue.global(qos:.userInitiated).async { [weak self] in
            do {
                let process=Process(), output=Pipe()
                process.executableURL=URL(fileURLWithPath:node)
                let openerRoot=resources.appendingPathComponent("express",isDirectory:true)
                process.currentDirectoryURL=openerRoot
                process.arguments=[openerRoot.appendingPathComponent("src/ui/open-country.js").path,country]
                process.standardInput=FileHandle.nullDevice;process.standardOutput=output;process.standardError=FileHandle.nullDevice
                try process.run()
                DispatchQueue.global().asyncAfter(deadline:.now()+20) { if process.isRunning { process.terminate() } }
                let data=output.fileHandleForReading.readDataToEndOfFile();process.waitUntilExit()
                let result=try JSONSerialization.jsonObject(with:data) as? [String:Any]
                DispatchQueue.main.async {
                    self?.countryOpenings.remove(country)
                    if process.terminationStatus == 0, let result=result { self?.countryOpened(id:id,result:result) }
                    else { self?.countryOpened(id:id,error:result?["error"] as? String ?? "No se pudo abrir Chrome Renzo.") }
                }
            } catch {
                DispatchQueue.main.async { self?.countryOpenings.remove(country);self?.countryOpened(id:id,error:"No se pudo abrir Chrome Renzo: \(error.localizedDescription)") }
            }
        }
    }
    private func countryOpened(id:String,result:[String:Any]?=nil,error:String?=nil) {
        var value:[String:Any]=["id":id];if let result=result {value["result"]=result};if let error=error {value["error"]=error}
        guard let data=try? JSONSerialization.data(withJSONObject:value),let json=String(data:data,encoding:.utf8) else {return}
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('collector-country-express',{detail:"+json+"}));",completionHandler:nil)
    }
    @objc private func refreshAdmin() { webView?.load(nativeRequest()) }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool {true}
    func applicationShouldTerminate(_ sender:NSApplication)->NSApplication.TerminateReply {
        guard let url=URL(string:address+"/api/app/quit") else {return .terminateNow}
        var request=nativeRequest();request.url=url;request.httpMethod="POST";request.timeoutInterval=3
        URLSession.shared.dataTask(with:request){[weak self] _,_,_ in
            DispatchQueue.main.async {if let process=self?.backend,process.isRunning {process.terminate()};sender.reply(toApplicationShouldTerminate:true)}
        }.resume()
        return .terminateLater
    }
}
let app=NSApplication.shared
app.setActivationPolicy(.regular)
let delegate=AppDelegate();app.delegate=delegate;app.run()
