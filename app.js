// Import the Express module
const express = require('express');
const axios = require('axios');
// Create an instance of an Express application
const app = express();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
var bodyParser = require('body-parser')
const fs = require('fs');
// Define a port number for the server to listen on
const port = 3000;
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
  // Helper function to parse numbers
  const parseNumber = (text) => {
    const number = parseFloat(text.replace(/,/g, '').replace(/[^0-9.]/g, ''));
    return isNaN(number) ? text : number;
  };
  
  function extractStats(aside) {
    const $ = cheerio.load(aside);
    const stats = {};
  
    // Extract data from each section
    $('.border.border-default').each((index, element) => {
      const $element = $(element);
      const groupName = $element.find('h3').first().text().trim(); // Get the group name from the first h3 element
      const groupData = {};
  
      $element.find('.cursor-help').each((idx, div) => {
        const $div = $(div);
        const label = $div.find('div').find("span").text().trim(); // Get text from the div
       
        const value = $div.find('span').last().text().trim(); // Get text from the span
        groupData[label] = parseNumber(value) || value; // Parse numbers where possible
      });
  
      stats[groupName] = groupData;
    });
  
    return stats;
  }
// Define a single route
app.post('/', async (req, res) => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: {
            width:1920,
            height:1080
      } 
    });
    const page = await browser.newPage();
  
    // Replace this URL with the URL of the page you want to scrape
    await page.goto(req.body.url, { waitUntil: 'networkidle0' });
    // Optionally, wait for a specific element to appear on the page
    await page.waitForSelector('.tabular-nums', { timeout: 5000 });
    // Get the HTML content of the page
    const html = await page.content();
    fs.writeFileSync('output.html', html);
    //console.log(html)
    const $ = cheerio.load(html);
    // Load HTML content from a file or directly from a string

    const aside = $('main .block aside').html();
    // Define a function to extract data
    

    // Extract stats
    const stats = extractStats(aside);

    // Write to JSON file
    console.log(JSON.stringify(stats, null, 2));
    res.json(stats);
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Express app is listening at http://localhost:${port}`);
});