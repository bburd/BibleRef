const tar = require('tar-fs');
const path = require('path');

/**
 * Safely extract a tar archive stream into a destination directory.
 * Entries that would write outside the destination or contain
 * symbolic links are ignored.
 *
 * @param {stream.Readable} stream - tar archive stream
 * @param {string} dest - destination directory
 * @param {object} [options] - optional tar-fs options
 * @returns {Promise<void>} resolves when extraction finishes
 */
function safeExtract(stream, dest, options = {}) {
  const root = path.resolve(dest) + path.sep;

  return new Promise((resolve, reject) => {
    const extractor = tar.extract(dest, {
      ...options,
      // ensure map is executed before our path checks
      map: (header) => {
        if (options.map) header = options.map(header) || header;
        header.name = path
          .normalize(header.name)
          .replace(/^(\.\.([/\\]|$))+/, '')
          .replace(/^[/\\]+/, '');
        return header;
      },
      ignore: (name, header) => {
        if (typeof options.ignore === 'function' && options.ignore(name, header)) {
          return true;
        }
        if (header.type === 'symlink' || header.type === 'link') {
          return true;
        }
        return !name.startsWith(root);
      },
    });

    extractor.on('finish', resolve);
    extractor.on('error', reject);
    stream.pipe(extractor);
  });
}

module.exports = { safeExtract };
