const puppeteer = require('puppeteer');
const { authenticator } = require('otplib');

const MFA_SECRET = 'drfvdcxkgqghrggg';  // Replace with actual secret key

(async () => {
    const browser = await puppeteer.launch({ headless: true, slowMo: 50 });
    const page = await browser.newPage();

    await page.goto('https://www.microsoftazuresponsorships.com/Balance');

    // Enter Email
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'username');
    await page.keyboard.press('Enter');

    // Enter Password
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', 'password');
    await page.keyboard.press('Enter');

    // Wait for MFA field
    await page.waitForSelector('input[type="tel"], input[type="text"]');

    // Generate MFA Code
    const otpCode = authenticator.generate(MFA_SECRET);
    console.log('Generated MFA Code:', otpCode);

    // Enter MFA Code
    await page.type('input[type="tel"], input[type="text"]', otpCode);
    await page.keyboard.press('Enter');


    // Wait for "Stay signed in?" page to appear
    await page.waitForSelector('input[value="Yes"]', { timeout: 10000 });

    // Click "Yes" button
    await page.click('input[value="Yes"]');


    await page.waitForSelector('div > .used-balance'); 
    await page.waitForSelector('div > .remaining-balance'); 
    //await page.waitForSelector('.total-balance'); 
    
    const usedBalance = await page.$eval('.used-balance', el => el.innerText);
    const remainingBalance = await page.$eval('.remaining-balance', el => el.innerText);
    // const totalBalance = await page.$eval('.total-balance', el => el.innerText);
    

    console.log("Used Balance:", usedBalance);
    console.log("Remaining Balance:", remainingBalance);
    //console.log("Total Balance:", totalBalance);
    //await element.dispose();

    await browser.close();

})();
