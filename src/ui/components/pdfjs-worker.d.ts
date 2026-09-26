// Il worker di pdfjs, dichiarato perché TypeScript lo lasci importare:
// `pdfjs-dist` non ne porta i tipi. Serve solo `WorkerMessageHandler`, che
// pdfjs cerca in `globalThis.pdfjsWorker` (vedi `thumbnails.ts`).

declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown
}
