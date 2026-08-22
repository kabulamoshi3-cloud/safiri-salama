// Stub module — provides empty exports for unavailable native modules
module.exports = new Proxy({}, {
  get: () => () => {},
});
