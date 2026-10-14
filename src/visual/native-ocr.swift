import Foundation
import ImageIO
import Vision

do {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "OCR", code: 1, userInfo: [NSLocalizedDescriptionKey: "Expected one PNG path"]) }
    let url = URL(fileURLWithPath: CommandLine.arguments[1])
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "OCR", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot decode screenshot"])
    }
    guard image.width * image.height <= 40_000_000 else { throw NSError(domain: "OCR", code: 3, userInfo: [NSLocalizedDescriptionKey: "Screenshot exceeds 40 megapixels"]) }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["es-ES", "en-US"]
    request.usesLanguageCorrection = false
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    let width = Double(image.width), height = Double(image.height)
    let lines: [[String: Any]] = (request.results ?? []).prefix(5000).compactMap { observation in
        guard let text = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox
        return ["text": text.string, "confidence": Double(text.confidence), "box": [
            "x": box.minX * width, "y": (1 - box.maxY) * height,
            "width": box.width * width, "height": box.height * height
        ]]
    }
    let result = try JSONSerialization.data(withJSONObject: ["width": image.width, "height": image.height, "lines": lines], options: [.sortedKeys])
    FileHandle.standardOutput.write(result)
} catch {
    FileHandle.standardError.write(Data(error.localizedDescription.utf8))
    exit(1)
}
