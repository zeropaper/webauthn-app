
export default async function waitFor(check: Function, max: number = 10000): Promise<void> {
  const started = new Date().getTime();
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        if (await check()) {
          clearInterval(interval);
          resolve();
        }
        if (new Date().getTime() - started > max) {
          reject(new Error('timeout'));
        }
      }
      catch (e) {
        clearInterval(interval);
        reject(e);
      }
    });
  });
}
