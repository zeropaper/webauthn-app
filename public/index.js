(async () => {
  let prev = {};
  store.subscribe(() => {
    const state = store.getState();

    if (
      state.session.registrationOptions &&
      !prev.session.registrationOptions
    ) {
      console.info('start authenticator registration');
    } else if (
      state.session.authenticationOptions &&
      !prev.session.authenticationOptions
    ) {
      console.info('start authenticator authentication');
    }
    prev = state;
  });

  async function initialize() {
    try {
      await store.session.fetch();
    } catch (err) {
      console.error('Failed to fetch session', err);
    }
  }

  await initialize();
})();
