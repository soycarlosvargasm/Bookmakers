// A controlled image fixture, never a capture of a live sportsbook.
import AppKit
let image = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1000, pixelsHigh: 500,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: image)
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: 1000, height: 500).fill()
let attributes: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 32), .foregroundColor: NSColor.black]
for (text, y) in [("Alpha FC vs Beta FC", 400.0), ("Moneyline", 330.0), ("Alpha FC 1.85", 250.0), ("Beta FC 2.10", 180.0)] {
    (text as NSString).draw(at: NSPoint(x: 60, y: y), withAttributes: attributes)
}
NSGraphicsContext.restoreGraphicsState()
try image.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
