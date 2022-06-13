import { test, expect } from '@playwright/test';
import simulateEmail from '../test/simulateEmail';

test('test', async ({ page, request }) => {
  page.on('console', msg => console.log(msg.text()))
  // Go to http://localhost:9000/
  await page.goto('/');

  // await page.locator('a.email').click()
  const emailLink = await page.locator('a.email');
  const sessionId = await page.$eval('a.email', async (el: HTMLLinkElement) => {
    const sid = el.textContent.split('+')?.at(1)?.split('@')?.at(0);
    return sid;
  });
  console.info('[test] sid', sessionId);
  await request.post('/test/simulate/incoming-mail', {
    data: {
      from: 'someone@local.test',
      sessionId,
    }
  })
  await request.post('/webhook')

  // Click text=Logout
  await page.locator('text=Logout').click();

  // Click text=Start
  await page.locator('text=Start').click();
});