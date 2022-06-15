import { test, Page, APIRequestContext } from '@playwright/test';

async function sendMail(page: Page, request: APIRequestContext) {
  // await page.waitForFunction(() => (document.querySelector('.email')?.textContent?.length || 0) > 0);
  await page.waitForTimeout(100);

  const sessionId = await page.$eval('.email', async (el: any) => {
    const sid = el?.textContent?.split('+')?.at(1)?.split('@')?.at(0);
    console.info('[test] pageFunction sid', el?.textContent, sid);
    return sid;
  });
  console.info('[test] sid', sessionId);

  await request.post('/test/simulate/incoming-mail', {
    data: {
      from: 'someone@local.test',
      sessionId,
    }
  });

  await page.locator('web-authn button', { hasText: 'Cancel' });

  await request.post('/webhook');
}

test('registration', async ({ page, request }) => {
  await page.goto('/');

  await page.locator('web-authn button', { hasText: 'Start' }).click();

  await page.locator('web-authn .email:visible');
  await sendMail(page, request);

  // TODO: simulate the webauthn registration
  // await page.locator('web-authn button', { hasText: 'Register' }).click();

  await page.locator('web-authn button', { hasText: 'Logout' }).click();

  await page.locator('web-authn button', { hasText: 'Start' });
  await page.reload();
  await page.locator('web-authn button', { hasText: 'Start' });
});

test('authentication', async ({ page, request }) => {
  await page.goto('/');

  await page.locator('web-authn button', { hasText: 'Start' }).click();

  await page.locator('web-authn .email:visible');
  await sendMail(page, request);

  // TODO: simulate the webauthn authentication
  // await page.locator('web-authn button', { hasText: 'Authenticate' }).click();

  await page.locator('web-authn button', { hasText: 'Logout' }).click();

  await page.locator('web-authn button', { hasText: 'Start' });
  await page.reload();
  await page.locator('web-authn button', { hasText: 'Start' });
});
