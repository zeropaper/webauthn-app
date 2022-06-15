(async () => {
  async function initialize() {
    try {
      await store.session.fetch();
    } catch (err) {
      console.error('Failed to fetch session', err);
    }
  }

  await initialize();
})();
