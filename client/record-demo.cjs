const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Starting Playwright...');
  if (!fs.existsSync('./videos')) fs.mkdirSync('./videos');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: './videos/',
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await delay(3000);

    // If already logged in, we might not see "Sign In"
    if (await page.isVisible('text=Sign In')) {
      console.log('Logging in...');
      await page.click('text=Sign In');
      await delay(1000);
      await page.fill('input[type="email"]', 'admin@tradex.local');
      await page.fill('input[type="password"]', 'Passw0rdDemo');
      await page.click('button[type="submit"]');
      await delay(4000);
    }

    console.log('Viewing Dashboard...');
    await delay(3000);

    console.log('Navigating to Markets...');
    await page.goto('http://localhost:5173/markets');
    await delay(3000);

    console.log('Selecting RELIANCE...');
    await page.goto('http://localhost:5173/markets/RELIANCE');
    await delay(4000);

    console.log('Placing a Market Buy order for 10 shares...');
    await page.fill('input[type="number"]', '10');
    await page.click('text=Review Order');
    await delay(1000);
    await page.click('text=Confirm Buy');
    await delay(3000);

    console.log('Checking Portfolio...');
    await page.goto('http://localhost:5173/portfolio');
    await delay(4000);

    console.log('Checking Ledger...');
    await page.goto('http://localhost:5173/transactions');
    await delay(4000);

    console.log('Logging out...');
    try {
      await page.click('text=Logout');
    } catch (e) {
      // ignore
    }
    await delay(2000);
  } catch (err) {
    console.error('Error during demo:', err);
  }

  console.log('Closing browser...');
  await context.close();
  await browser.close();
  console.log('Video saved to ./videos/');
})();
