import AppKit

// A rounded macOS icon tile, with transparent margins around the white face.
guard CommandLine.arguments.count == 3,
      let logo = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("Could not prepare the app icon")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
let canvas = NSRect(x: 0, y: 0, width: 1024, height: 1024)
context.cgContext.clear(canvas)
context.imageInterpolation = .high
context.cgContext.setShouldAntialias(true)
let tile = NSRect(x: 64, y: 64, width: 896, height: 896)
let face = NSBezierPath(roundedRect: tile, xRadius: 196, yRadius: 196)
NSGraphicsContext.saveGraphicsState()
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.16)
shadow.shadowBlurRadius = 16
shadow.shadowOffset = NSSize(width: 0, height: -8)
shadow.set()
NSColor.white.setFill()
face.fill()
NSGraphicsContext.restoreGraphicsState()
NSColor(white: 0.86, alpha: 1).setStroke()
face.lineWidth = 1.5
face.stroke()
let logoArea = tile.insetBy(dx: 24, dy: 24)
let scale = min(logoArea.width / logo.size.width, logoArea.height / logo.size.height)
let size = NSSize(width: logo.size.width * scale, height: logo.size.height * scale)
logo.draw(in: NSRect(x: (1024 - size.width) / 2, y: (1024 - size.height) / 2,
                    width: size.width, height: size.height),
          from: .zero, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Could not encode the app icon")
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
