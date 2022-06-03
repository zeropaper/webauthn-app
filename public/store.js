(() => {
  const sessionReducer = (state = {}, action) => {
    switch (action.type) {
      case 'SET_SESSION':
        return action.payload || {};
      case 'LOGOUT':
        return {};
      default:
        return state;
    }
  };

  function setSession(session) {
    return {
      type: 'SET_SESSION',
      payload: session,
    };
  }

  function fetchSession() {
    return fetch('/session')
      .then((res) => res.json())
      .then(setSession)
      .catch(() => setSession({}));
  }

  function ensureSession() {
    return fetch('/session', { method: 'POST' })
      .then((res) => res.json())
      .then(setSession);
  }

  function destroySession() {
    return fetch('/session', { method: 'DELETE' }).then(() => ({
      type: 'LOGOUT',
    }));
  }

  const preloadedState = {
    wizard: 'initial',
    session: {},
  };

  function thunk({ dispatch, getState }) {
    return (next) => (action) => {
      if (typeof action === 'function') {
        return action(dispatch, getState);
      }
      return next(action);
    };
  }

  const combinedReducer = Redux.combineReducers({
    wizard: (state) => state || 'initial',
    session: sessionReducer,
  });
  const store = Redux.createStore(
    (original, action, meta) => {
      const state = combinedReducer(original, action, meta);
      // state.wizard = 'initial';
      // if (state.session.userId) {
      //   state.wizard = 'authenticated';
      // } else if (state.session.sessionId) {
      //   state.wizard = 'authenticating';
      // }
      return state;
    },
    preloadedState,
    Redux.applyMiddleware(thunk)
  );

  function wrap(fn) {
    return async (...args) => store.dispatch(await fn(...args));
  }

  window.store = {
    ...store,
    session: {
      fetch: wrap(fetchSession),
      ensure: wrap(ensureSession),
      destroy: wrap(destroySession),
      set: wrap(setSession),
    },
  };
  console.info('[redux] store', store);
})();
