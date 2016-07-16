require('source-map-support').install();
require('babel-register');
require('babel-polyfill');

function kill (e) {
  console.trace(e);
  process.exit(1);
}

process.on('uncaughtException', kill);
process.on('unhandledRejection', kill);
