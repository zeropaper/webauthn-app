(() => {
  const { browserSupportsWebauthn, startRegistration, startAuthentication } =
    SimpleWebAuthnBrowser;

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

  async function registerDevice() {
    if (!browserSupportsWebauthn()) throw new Error('WebAuthn not supported');
    const endpoint = '/webauthn/registration';
    const registrationResponse = await fetch(endpoint);
    const info = await startRegistration(await registrationResponse.json());
    const verificationResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(info),
    });
    const response = await verificationResponse.json();
    if (response.verified) {
      console.info('[webauthn] device registered', response);
      return {
        type: 'SET_REGISTERED_DEVICE',
      };
    }
    throw new Error('Failed to register device');
  }

  async function authenticateDevice() {
    if (!browserSupportsWebauthn()) throw new Error('WebAuthn not supported');
    const endpoint = '/webauthn/authentication';
    const authenticationResponse = await fetch(endpoint);
    const info = await startAuthentication(await authenticationResponse.json());
    const verificationResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(info),
    });
    const response = await verificationResponse.json();
    if (response.verified) {
      console.info('[webauthn] device authenticated', response);
      return {
        type: 'SET_AUTHENTICATED_DEVICE',
      };
    }
    throw new Error('Failed to authenticate device');
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
  const reducer = (original, action, meta) => {
    const state = combinedReducer(original, action, meta);
    return state;
  };
  const store = Redux.createStore(
    reducer,
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
      registerDevice: wrap(registerDevice),
      authenticateDevice: wrap(authenticateDevice),
    },
  };
  console.info('[redux] store', store);
})();
