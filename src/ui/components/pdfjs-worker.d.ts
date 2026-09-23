// Il worker di pdfjs, dichiarato perché TypeScript lo lasci importare.
//
// Il pacchetto `pdfjs-dist` porta i tipi del lettore ma non quelli del worker:
// è un file pensato per girare dentro un `Worker`, non per essere importato.
// Qui lo si importa apposta — vedi `thumbnails.ts`, dove si spiega perché il
// worker gira sul filo principale — e quel che serve di lui è una cosa sola,
// `WorkerMessageHandler`, che pdfjs cerca in `globalThis.pdfjsWorker`.

declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown
}
