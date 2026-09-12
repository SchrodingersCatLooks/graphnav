import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
export function loadPdf(bytes: Uint8Array) {
  return getDocument({
    data: bytes.slice(),
    standardFontDataUrl: new URL('/pdf-assets/standard_fonts/', location.origin).href,
    cMapUrl: new URL('/pdf-assets/cmaps/', location.origin).href,
    cMapPacked: true,
    wasmUrl: new URL('/pdf-assets/wasm/', location.origin).href,
    enableXfa: false,
  });
}
