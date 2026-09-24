/** Stop the shared replica set once every suite has finished. */
module.exports = async () => {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }
};
