const express = require('express');
const puppeteer = require('puppeteer');
const { authenticator } = require('otplib');
const axios = require('axios');

const app = express();
const PORT = 3000;

const API_KEY = "ITG.132698ea5fa38d719569101f3b41a3a7.UGlHXjJ3iNyFXJAqEMQ_BQgFF7iI7zGf8OIRRSc6zLuCiNdGUpBNC2Y8CtogHP5j";
const BASE_URL = 'https://api.itglue.com';
const ORG_ID = "3170330";
const PASSWORD_ID = '11818195';
const ADHY_MFA_SECRET = 'skhgc2sxpqvzxlq5';

const headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
};

async function getPasswordById(orgId, passwordId) {
    try {
        const response = await axios.get(`${BASE_URL}/organizations/${orgId}/relationships/passwords/${passwordId}`, { headers });
        if (response.data && response.data.data) {
            return {
                username: response.data.data.attributes.username,
                password: response.data.data.attributes.password,
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching password:', error.message);
        return null;
    }
}

async function getAzureBalances() {
    const credentials = await getPasswordById(ORG_ID, PASSWORD_ID);
    if (!credentials) throw new Error('Failed to fetch credentials');
    
    const browser = await puppeteer.launch({
        headless: false,  // Headless mode to reduce load time
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
      await page.type('input[type="email"]', credentials.username);
      await page.keyboard.press('Enter');
    
      // Enter Password (use the fetched password)
      await page.waitForSelector('input[type="password"]');
      await page.type('input[type="password"]', credentials.password);
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
      await page.waitForSelector('div > .remainingDays');
      //await page.waitForSelector('.total-balance'); 
    
      const usedBalance = await page.$eval('.used-balance', el => el.innerText);
      const remainingBalance = await page.$eval('.remaining-balance', el => el.innerText);
      const remainingDays = await page.$eval('.remainingDays', el => el.innerText.trim());
      // const totalBalance = await page.$eval('.total-balance', el => el.innerText);
      
      await browser.close();
    return { usedBalance, remainingBalance, remainingDays };
}

app.get('/api/azure-balance', async (req, res) => {
    try {
        const balances = await getAzureBalances();
        res.json(balances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
