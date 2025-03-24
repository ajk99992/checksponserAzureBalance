const puppeteer = require('puppeteer');
const { authenticator } = require('otplib');
const axios = require('axios');  // Add axios to fetch password from IT Glue

const API_KEY = "hidden";
const BASE_URL = 'https://api.itglue.com';
const ORG_ID = "3170330"; // Replace with your organization ID
const PASSWORD_ID = '11818195';  // The password ID for O365 Admin

const ADHY_MFA_SECRET = 'skhgc2sxpqvzxlq5';

//const ACMA_MFA_SECRET = 'drfvdcxkgqghrggg';  // Replace with actual secret key

const headers = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json',
};

// Function to fetch a specific password by ID from IT Glue
async function getPasswordById(orgId, passwordId) {
  try {
    const response = await axios.get(`${BASE_URL}/organizations/${orgId}/relationships/passwords/${passwordId}`, { headers });
    
    if (response.data && response.data.data) {
      const passwordData = response.data.data.attributes;
      return {
        username: passwordData.username,
        password: passwordData.password,
      };
    }
    console.log('Password not found.');
    return null;
  } catch (error) {
    console.error('Error fetching password:', error.response ? error.response.data : error.message);
    return null;
  }
}

(async () => {
  // Fetch credentials from IT Glue
  const credentials = await getPasswordById(ORG_ID, PASSWORD_ID);

  if (!credentials) {
    console.error('Failed to fetch credentials.');
    return;
  }

  const { username, password } = credentials;


    // Log the username and password for debugging purposes
    console.log('Fetched Username:', username);
    console.log('Fetched Password:', password);  // Make sure it's the correct password

  // Launch browser in headless mode with optimization settings
  const browser = await puppeteer.launch({
    headless: true,  // Headless mode to reduce load time
    slowMo: 55,  // Reduce animation speed for debugging (can be removed)
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // Optional, may improve stability
        "--disable-gpu"
      ]
  });

  const page = await browser.newPage();


  await page.goto('https://www.microsoftazuresponsorships.com/Balance');

  // Enter Email (use the fetched username)
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', username);
  await page.keyboard.press('Enter');

  // Enter Password (use the fetched password)
  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="password"]', password);
  await page.keyboard.press('Enter');

  // Wait for MFA field
  await page.waitForSelector('input[type="tel"], input[type="text"]');

  // Generate MFA Code
  const otpCode = authenticator.generate(ADHY_MFA_SECRET);
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

  await browser.close();

})();
