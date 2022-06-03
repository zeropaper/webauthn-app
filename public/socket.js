(() => {
  const socket = io({
    autoConnect: false,
  });

  socket.onAny((...args) => console.info('[io] any ----', ...args));

  socket.on('sessionBound', store.session.set);

  socket.on('sessionSocketsChange', (data, ack) => {
    store.session.set(data);
    if (typeof ack === 'function') ack();
  });

  socket.on('connect', () => {
    const engine = socket.io.engine;
    console.log('[io]', engine.transport.name); // in most cases, prints "polling"

    engine.once('upgrade', () => {
      // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
      console.log('[io]', engine.transport.name); // in most cases, prints "websocket"
    });

    engine.on('packet', ({ type, data }) => {
      // called for each packet received
    });

    engine.on('packetCreate', ({ type, data }) => {
      // called for each packet sent
    });

    engine.on('drain', () => {
      // called when the write buffer is drained
    });

    engine.on('close', (reason) => {
      // called when the underlying connection is closed
    });
  });
  window.socket = socket;
})();
