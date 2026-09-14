// pdfjs-dist doesn't ship types for its worker entry point specifically -
// we only need it as an opaque module handed to globalThis.pdfjsWorker (see
// lib/schemeImport/parsePdf.ts), never its actual exports' shapes.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
