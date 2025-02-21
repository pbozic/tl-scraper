import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import * as cheerio from 'cheerio';
import axios from 'axios';
import antibotbrowser from 'antibotbrowser';
// Helper function to parse numbers
const parseNumber = (text) => {
	const number = parseFloat(text.replace(/,/g, '').replace(/[^0-9.]/g, ''));
	return isNaN(number) ? text : number;
};

function extractStats(aside) {
	console.log("aside", aside)
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
export default async function handler(req, res) {
	const proxies = await fetchAndTestProxies();
	console.log("proxies", proxies)
	const proxy = proxies[0];
	console.log("Request received")
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed, use POST' });
	}
	try {
		const antibrowser = await antibotbrowser.startbrowser();
		const browser = await puppeteer.connect({browserWSEndpoint: antibrowser.websokcet});
		// const browser = await puppeteer.launch({
		// 	headless: false,
		// 	args: [...chromium.args, `--proxy-server =${proxy.host}:${proxy.port}`],
		// 	executablePath: await chromium.executablePath(
		// 		`https://github.com/Sparticuz/chromium/releases/download/v126.0.0/chromium-v126.0.0-pack.tar`
		// 	),
		// 	defaultViewport: {
		// 		width: 1920,
		// 		height: 1080
		// 	}
		// });
		let [page] = await browser.pages(); // Gets the first page/tab in the browser
		await page.setExtraHTTPHeaders({
			'Accept-Language': 'en'
		});
		// Object to store console messages
		const consoleData = {
			log: [],
			error: [],
			warning: [],
			info: [],
			debug: [],
			trace: []
		};

		// Function to handle console messages
		page.on('console', async msg => {
			const messageType = msg.type();
			const messageText = msg.text();
			const messageArgs = [];

			// Collect all arguments
			for (let i = 0; i < msg.args().length; i++) {
				try {
					const value = await msg.args()[i].jsonValue();
					messageArgs.push(value);
				} catch (e) {
					messageArgs.push(`Error retrieving argument ${i}`);
				}
			}

			// Create a structured message object
			const messageObject = {
				text: messageText,
				args: messageArgs,
				location: msg.location ? {
					lineNumber: msg.location().lineNumber,
					columnNumber: msg.location().columnNumber
				} : undefined
			};

			// Store the message in the corresponding type array
			if (messageType in consoleData) {
				consoleData[messageType].push(messageObject);
			} else {
				consoleData[messageType] = [messageObject];
			}
		});
		let requests = [];
		let responses = [];
		page.on('request', async (req) => {
			// if request is for a specific resource
			const cookies = await page.cookies()
			for (let i = 0; i < cookies.length; i++) {
				if (cookies[i].name === 'cf_clearance') {
					page.setCookie({
						name: 'cf_clearance',
						value: cookies[i].value,
						domain: 'questlog.gg',
						httpOnly: true, // Cookie cannot be accessed via JavaScript
						secure: true,   // Cookie is sent only over HTTPS
					})
				}
			}

			// otherwise go to login page and login yourself
			requests.push({
				request: req.url(),
				method: req.method(),
				headers: req.headers(),
				postData: req.postData(),

			});
			const headers = req.headers();

			// Modify headers as needed
			headers['Accept-Encoding'] = 'gzip, deflate, br, zstd';
			headers['Accept-Language'] = 'en-US,en;q=0.9,sl;q=0.8,de;q=0.7';
			headers['Cache-Control'] = 'no-cache';
			headers['Pragma'] = 'no-cache';
			headers['Priority'] = 'u=1, i';
			headers['Sec-CH-UA'] = '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"';
			headers['Sec-CH-UA-Mobile'] = '?0';
			headers['Sec-CH-UA-Platform'] = '"Windows"';
			headers['Sec-Fetch-Dest'] = 'empty';
			headers['Sec-Fetch-Mode'] = 'cors';
			headers['Sec-Fetch-Site'] = 'same-origin';
		
			// Continue the request with modified headers
			req.continue({ headers });
		});
		page.on('response', async (res) => {
			responses.push({
				request: res.url(),
				status: res.status(),
				headers: res.headers(),

			});
		});
		console.log("Browser launched")

		await page.setRequestInterception(true);
		await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36')
		console.log(req.body.url)
		// Replace this URL with the URL of the page you want to scrape
		await page.goto(req.body.url);
		await page.setCookie({
			name: '__Secure-next-auth.callback-url',
			value: 'https%3A%2F%2Fquestlog.gg%2Fthrone-and-liberty%2Fen%2Fcharacter-builder%2FBreathScorpionOfTheTime',
			domain: 'questlog.gg',
			httpOnly: true, // Cookie cannot be accessed via JavaScript
			secure: true,   // Cookie is sent only over HTTPS
		});
		const cookies1 = await page.cookies()
			for (let i = 0; i < cookies1.length; i++) {
				if (cookies1[i].name === 'cf_clearance') {
					page.setCookie({
						name: 'cf_clearance',
						value: cookies1[i].value,
						domain: 'questlog.gg',
						httpOnly: true, // Cookie cannot be accessed via JavaScript
						secure: true,   // Cookie is sent only over HTTPS
					})
				}
			}
		await page.goto(req.body.url, { waitUntil: 'networkidle2' });
		await page.evaluate(() => {
			navigator.__defineGetter__('userAgent', function () {
				return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
			});
			navigator.__defineGetter__('appName', function () {
				return "Netscape"
			});
		});
		await page.setCookie({
			name: '__Secure-next-auth.callback-url',
			value: 'https%3A%2F%2Fquestlog.gg%2Fthrone-and-liberty%2Fen%2Fcharacter-builder%2FBreathScorpionOfTheTime',
			domain: 'questlog.gg',
			httpOnly: true, // Cookie cannot be accessed via JavaScript
			secure: true,   // Cookie is sent only over HTTPS
		});
		// Optionally, wait for a specific element to appear on the page
		console.log("Page loaded")
		// Get the HTML content of the page
		const screenshotBuffer = await page.screenshot();
		const screenshotBase64 = screenshotBuffer.toString('base64');
		const html = await page.content();
		const pageUrl = page.url();
		console.log("url", pageUrl)

		console.log("Content loaded")
		const cookies = await page.cookies();
		//console.log(html)
		const $ = cheerio.load(html);
		// Load HTML content from a file or directly from a string

		const aside = $('main .block aside').html();
		// Define a function to extract data


		// Extract stats
		//const stats = extractStats(aside);

		// Write to JSON file
		//console.log(JSON.stringify(stats, null, 2));
		res.json({
			cookies: cookies,
			sc: `data:image/png;base64,${screenshotBase64}`,
			log: consoleData,
			requests: requests,
			responses: responses,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'An error occurred' });

	}

}

async function fetchAndTestProxies() {
	let {data} = await axios.get("https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=ipport&format=json");
	return data.proxies.map((p) => {
		return {
			host: p.ip,
			port: p.port
		}
	});
  }