// Replacement for the `mime` package in the bundle (`scripts/bundle.mjs`). teleproto calls
// `mime.getType(path)` to pick photo / document / audio when uploading and
// `mime.getExtension(mimeType)` to name downloaded documents, so the stub must implement both.
// Common extensions only; unknown types fall back to teleproto's own defaults.
export const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  bmp: 'image/bmp', heic: 'image/heic', tif: 'image/tiff', tiff: 'image/tiff', svg: 'image/svg+xml',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  wav: 'audio/wav', flac: 'audio/x-flac', aac: 'audio/x-aac',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  pdf: 'application/pdf', zip: 'application/zip', json: 'application/json', txt: 'text/plain',
  md: 'text/markdown', csv: 'text/csv', html: 'text/html', xml: 'application/xml', rtf: 'application/rtf',
  doc: 'application/msword', xls: 'application/vnd.ms-excel', ppt: 'application/vnd.ms-powerpoint',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation', epub: 'application/epub+zip',
  gz: 'application/gzip', '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar',
  apk: 'application/vnd.android.package-archive',
};

/** CommonJS source of the stub module. */
export const mimeStubSource = `const M=${JSON.stringify(MIME)};const E={};
for(const k in M)if(!(M[k] in E))E[M[k]]=k;
exports.default=exports;
exports.getType=function(p){var m=/\\.([^./\\\\]+)$/.exec(String(p).toLowerCase());return m&&M[m[1]]||null};
exports.getExtension=function(t){var k=String(t||"").split(";")[0].trim().toLowerCase();return E[k]||null};`;
