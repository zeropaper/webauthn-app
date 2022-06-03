import { RequestHandler } from "express"

export default <RequestHandler>function logger(req, res, next) {
  res.on('close', () => {
    if (process.env.NODE_ENV !== 'test') {
      const headers = res.getHeaders();
      console.info('[request] %s %s%s', req.method, req.baseUrl || '', req.url,
        res.statusCode, Object.keys(headers).reduce((acc, key) => {
          if (!key.includes('cookie')) return acc;
          acc[key] = headers[key];
          return acc;
        }, {}));
    }
  })
  next()
}

