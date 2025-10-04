// Background service worker for Exractly Chrome Extension

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Exractly extension installed:', details.reason);
    
    if (details.reason === 'install') {
        // Set default settings
        chrome.storage.local.set({
            apiBaseUrl: 'http://localhost:3000/api',
            maxRetries: 3,
            timeout: 30000
        });
        
        console.log('Default settings configured');
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.type);
    
    switch (request.type) {
        case 'GET_PAGE_HTML':
            handleGetPageHTML(request, sender, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'EXTRACT_DATA':
            handleExtractData(request, sender, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'GET_SETTINGS':
            handleGetSettings(request, sender, sendResponse);
            return true;
            
        default:
            console.warn('Unknown message type:', request.type);
            sendResponse({ error: 'Unknown message type' });
    }
});

// Handle getting page HTML content
async function handleGetPageHTML(request, sender, sendResponse) {
    try {
        const tabId = sender.tab?.id || request.tabId;
        
        if (!tabId) {
            throw new Error('No tab ID available');
        }

        // Execute script to get HTML content
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: () => {
                // Remove script tags and clean up HTML
                const clonedDoc = document.cloneNode(true);
                const scripts = clonedDoc.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                
                return {
                    html: clonedDoc.documentElement.outerHTML,
                    url: window.location.href,
                    title: document.title
                };
            }
        });

        sendResponse({ success: true, data: result.result });
    } catch (error) {
        console.error('Error getting page HTML:', error);
        sendResponse({ 
            success: false, 
            error: error.message || 'Failed to get page content' 
        });
    }
}

// Handle data extraction request
async function handleExtractData(request, sender, sendResponse) {
    try {
        const settings = await getSettings();
        const { url, html, instruction } = request.data;

        // Make API request to backend
        const response = await fetch(`${settings.apiBaseUrl}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, html, instruction })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const result = await response.json();
        
        // Store result in local storage for history
        await storeExtractionResult(result);
        
        sendResponse({ success: true, data: result });
    } catch (error) {
        console.error('Error extracting data:', error);
        sendResponse({ 
            success: false, 
            error: error.message || 'Failed to extract data' 
        });
    }
}

// Handle getting settings
async function handleGetSettings(request, sender, sendResponse) {
    try {
        const settings = await getSettings();
        sendResponse({ success: true, data: settings });
    } catch (error) {
        console.error('Error getting settings:', error);
        sendResponse({ 
            success: false, 
            error: error.message || 'Failed to get settings' 
        });
    }
}

// Helper function to get settings from storage
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'apiBaseUrl',
            'maxRetries',
            'timeout'
        ], (result) => {
            resolve({
                apiBaseUrl: result.apiBaseUrl || 'http://localhost:3000/api',
                maxRetries: result.maxRetries || 3,
                timeout: result.timeout || 30000
            });
        });
    });
}

// Helper function to store extraction results for history
async function storeExtractionResult(result) {
    try {
        // Get existing history
        const { extractionHistory = [] } = await new Promise((resolve) => {
            chrome.storage.local.get(['extractionHistory'], resolve);
        });

        // Add new result with timestamp
        const historyItem = {
            ...result,
            timestamp: Date.now(),
            id: result.record_id
        };

        // Keep only last 50 results
        const updatedHistory = [historyItem, ...extractionHistory].slice(0, 50);

        // Save back to storage
        await new Promise((resolve) => {
            chrome.storage.local.set({ extractionHistory: updatedHistory }, resolve);
        });

        console.log('Extraction result stored in history');
    } catch (error) {
        console.error('Error storing extraction result:', error);
    }
}

// Handle tab updates to refresh content if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Could be used to auto-refresh content or show notifications
        console.log('Tab updated:', tab.url);
    }
});

// Handle extension action click (optional - popup is default)
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension action clicked for tab:', tab.url);
    // This won't fire if popup is set, but keeping for future use
});

// Cleanup on extension shutdown
chrome.runtime.onSuspend.addListener(() => {
    console.log('Exractly extension suspending...');
});

console.log('Exractly background service worker loaded');
