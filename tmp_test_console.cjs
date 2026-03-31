const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.type()} - ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR: ' + err.toString());
  });

  try {
    await page.goto('http://localhost:8080/index.html', { waitUntil: 'load', timeout: 5000 });
  } catch (err) {
    console.error("Navigation error:", err);
  }
  
  // wait short time 
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
  console.log("TEST DONE");
})();
