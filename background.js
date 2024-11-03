// Replace these with your actual API keys
const GOOGLE_SAFE_BROWSING_API_KEY = 'AIzaSyA6JrLX_qA1wLASeTHhOpna8iGYA9o3hTs';
const WHOIS_API_KEY = 'HkwtsTpHnsZR2ma6XLgLN7ruKW6jKHOf';

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ alertThreshold: 50 }); // Default alert threshold
    console.log("Trustworthiness Extension Installed");
});

// Function to update the trustworthiness score
async function updateTrustworthinessScore(url) {
    if (!url) return; // Prevent errors if URL is missing
    const scoreDetails = await calculateTrustworthinessScore(url);
    chrome.storage.local.set({ trustScore: scoreDetails.totalScore, scoreBreakdown: scoreDetails.breakdown });

    // Check user-defined alert threshold and send a notification if the score is below it
    chrome.storage.local.get(['alertThreshold'], (result) => {
        const userThreshold = result.alertThreshold || 50;
        if (scoreDetails.totalScore < userThreshold) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Low Trustworthiness Score Alert',
                message: `The trustworthiness score for this site is ${scoreDetails.totalScore}, below your threshold of ${userThreshold}.`
            });
        }
    });
}

// Trigger updates when tabs are updated or activated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        updateTrustworthinessScore(tab.url);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateTrustworthinessScore(tab.url);
});

// Function to calculate the trustworthiness score based on SSL, reputation, and age
async function calculateTrustworthinessScore(url) {
    let totalScore = 0;
    const breakdown = {};

    // 1. SSL Check (HTTPS)
    if (url.startsWith("https://")) {
        totalScore += 30;
        breakdown.ssl = 30;
    } else {
        breakdown.ssl = 0;
    }

    // 2. Domain Reputation (Google Safe Browsing)
    breakdown.reputation = await checkDomainReputation(url);
    totalScore += breakdown.reputation;

    // 3. Domain Age (WHOIS)
    breakdown.age = await checkDomainAge(url);
    totalScore += breakdown.age;

    return { totalScore, breakdown };
}

// Check domain reputation via Google Safe Browsing API
async function checkDomainReputation(url) {
    const safeBrowsingEndpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`;
    const body = {
        client: { clientId: "trustworthiness_extension", clientVersion: "1.0" },
        threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: url }]
        }
    };

    try {
        const response = await fetch(safeBrowsingEndpoint, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        return data.matches ? 0 : 40; // 40 points if safe, 0 if unsafe
    } catch (error) {
        console.error("Error checking domain reputation:", error);
        return 20;
    }
}

// Check domain age via WHOIS API
async function checkDomainAge(url) {
    const domain = new URL(url).hostname;
    const whoisEndpoint = `https://api.apilayer.com/whois/check?domain=${domain}`;

    try {
        const response = await fetch(whoisEndpoint, {
            method: "GET",
            headers: { "apikey": WHOIS_API_KEY }
        });
        const data = await response.json();
        
        if (data.creationDate) {
            const creationDate = new Date(data.creationDate);
            const ageInYears = (new Date() - creationDate) / (1000 * 60 * 60 * 24 * 365);
            if (ageInYears > 5) return 30; // High score for older domains
            if (ageInYears > 1) return 20; // Medium score for newer but established domains
            return 10; // Low score for domains less than a year old
        }
        return 10;
    } catch (error) {
        console.error("Error checking domain age:", error);
        return 10;
    }
}
