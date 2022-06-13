import { test, expect } from '@playwright/test';
import simulateEmail from '../test/simulateEmail';

test('test', async ({ page, request }) => {
  page.on('console', msg => console.log(msg.text()))
  // Go to http://localhost:9000/
  await page.goto('/');

  await page.locator('text=Start').click()

  await page.locator('.email:visible');
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
  })

  await page.locator('text=Cancel')
  await request.post('/webhook')

  // Click text=Logout
  await page.locator('text=Logout').click();

  // Click text=Start
  await page.locator('text=Start').click();
});