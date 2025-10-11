// Popup JavaScript for Extractly Chrome Extension

// Simple logger for popup
const logger = {
    info: (message, ...args) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args),
    debug: (message, ...args) => console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args)
};

class ExtractlyPopup {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentTab = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadCurrentTab();
    }

    initializeElements() {
        // Get DOM elements
        this.elements = {
            currentUrl: document.getElementById('currentUrl'),
            instructionInput: document.getElementById('instructionInput'),
            extractBtn: document.getElementById('extractBtn'),
            btnText: document.querySelector('.btn-text'),
            btnLoader: document.querySelector('.btn-loader'),
            resultsSection: document.getElementById('resultsSection'),
            resultsContent: document.getElementById('resultsContent'),
            errorSection: document.getElementById('errorSection'),
            errorContent: document.getElementById('errorContent'),
            statusText: document.getElementById('statusText'),
            copyResultsBtn: document.getElementById('copyResultsBtn'),
            suggestionBtns: document.querySelectorAll('.suggestion-btn')
        };
    }

    attachEventListeners() {
        // Extract button click
        this.elements.extractBtn.addEventListener('click', () => this.handleExtract());

        // Enter key in textarea
        this.elements.instructionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleExtract();
            }
        });

        // Suggestion buttons
        this.elements.suggestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                this.elements.instructionInput.value = text;
                this.elements.instructionInput.focus();
            });
        });

        // Copy results button
        this.elements.copyResultsBtn.addEventListener('click', () => this.copyResults());

        // Footer links
        document.getElementById('webDashboardLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openWebDashboard();
        });
                                                                    
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showStatus('Help: Enter natural language instructions to extract data from the current page.');
        });
    }

    async loadCurrentTab() {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            
            // Display current URL
            if (tab && tab.url) {
                this.elements.currentUrl.textContent = this.truncateUrl(tab.url);
                this.showStatus('Ready to extract data from current page');
            } else {
                this.elements.currentUrl.textContent = 'Unable to access current page';
                this.showStatus('Please navigate to a webpage to extract data');
            }
        } catch (error) {
            logger.error('Error loading current tab:', error);
            this.elements.currentUrl.textContent = 'Error loading page';
            this.showStatus('Error: Unable to access current tab');
        }
    }

    async handleExtract() {
        if (this.isProcessing) return;

        const instruction = this.elements.instructionInput.value.trim();
        
        // Validation
        if (!instruction) {
            this.showError('Please enter an instruction for data extraction');
            return;
        }

        if (!this.currentTab || !this.currentTab.url) {
            this.showError('No active tab found. Please refresh and try again.');
            return;
        }

        // Check if URL is accessible
        if (this.currentTab.url.startsWith('chrome://') || 
            this.currentTab.url.startsWith('chrome-extension://') ||
            this.currentTab.url.startsWith('edge://') ||
            this.currentTab.url.startsWith('about:')) {
            this.showError('Cannot extract data from browser internal pages');
            return;
        }

        try {
            this.setProcessingState(true);
            this.hideResults();
            this.hideError();
            this.showStatus('Capturing page content...');

            // Get HTML content from the current tab
            const htmlContent = await this.getPageHTML();
            
            if (!htmlContent) {
                throw new Error('Unable to capture page content');
            }

            this.showStatus('Processing with AI...');

            // Send to backend for processing
            const result = await this.sendToBackend({
                url: this.currentTab.url,
                html: htmlContent,
                instruction: instruction
            });

            // Display results
            this.displayResults(result);
            this.showStatus(`Successfully extracted ${result.parsed_fields.length} fields`);

        } catch (error) {
            logger.error('Extraction error:', error);
            this.showError(error.message || 'Failed to extract data. Please try again.');
            this.showStatus('Extraction failed');
        } finally {
            this.setProcessingState(false);
        }
    }

    async getPageHTML() {
        try {
            // Inject content script to get HTML
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                function: () => {
                    // Return the full HTML content
                    return document.documentElement.outerHTML;
                }
            });

            return result.result;
        } catch (error) {
            logger.error('Error getting page HTML:', error);
            throw new Error('Unable to access page content. Please refresh the page and try again.');
        }
    }

    async sendToBackend(data) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to backend server. Please ensure the server is running on localhost:3000');
            }
            throw error;
        }
    }

    displayResults(result) {
        const { parsed_fields, extracted, confidence } = result;
        
        let html = '';
        
        parsed_fields.forEach(field => {
            const value = extracted[field];
            const conf = confidence[field];
            const confidencePercent = Math.round(conf * 100);
            
            html += `
                <div class="result-item">
                    <div class="result-field">${this.escapeHtml(field)}</div>
                    <div class="result-value">${this.escapeHtml(String(value || 'Not found'))}</div>
                    <div class="result-confidence">Confidence: ${confidencePercent}%</div>
                </div>
            `;
        });

        this.elements.resultsContent.innerHTML = html;
        this.elements.resultsSection.style.display = 'block';
        
        // Store results for copying
        this.lastResults = result;
    }

    copyResults() {
        if (!this.lastResults) return;

        const { parsed_fields, extracted, confidence } = this.lastResults;
        
        let text = 'Extractly Extraction Results\n';
        text += '=' .repeat(30) + '\n\n';
        
        parsed_fields.forEach(field => {
            const value = extracted[field];
            const conf = confidence[field];
            const confidencePercent = Math.round(conf * 100);
            
            text += `${field}: ${value || 'Not found'} (${confidencePercent}% confidence)\n`;
        });
        
        text += `\nExtracted from: ${this.currentTab.url}\n`;
        text += `Timestamp: ${new Date().toLocaleString()}\n`;

        navigator.clipboard.writeText(text).then(() => {
            this.showStatus('Results copied to clipboard!');
        }).catch(() => {
            this.showStatus('Unable to copy to clipboard');
        });
    }

    setProcessingState(processing) {
        this.isProcessing = processing;
        this.elements.extractBtn.disabled = processing;
        
        if (processing) {
            this.elements.btnText.style.display = 'none';
            this.elements.btnLoader.style.display = 'inline';
        } else {
            this.elements.btnText.style.display = 'inline';
            this.elements.btnLoader.style.display = 'none';
        }
    }

    showResults() {
        this.elements.resultsSection.style.display = 'block';
        this.elements.errorSection.style.display = 'none';
    }

    hideResults() {
        this.elements.resultsSection.style.display = 'none';
    }

    showError(message) {
        this.elements.errorContent.textContent = message;
        this.elements.errorSection.style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
    }

    hideError() {
        this.elements.errorSection.style.display = 'none';
    }

    openWebDashboard() {
        // Open the web dashboard in a new tab
        const dashboardUrl = 'http://localhost:3000';
        chrome.tabs.create({ url: dashboardUrl }, (tab) => {
            if (chrome.runtime.lastError) {
                logger.error('Error opening web dashboard:', chrome.runtime.lastError);
                this.showStatus('Unable to open dashboard. Please check if the server is running.');
            } else {
                this.showStatus('Opening web dashboard...');
                // Close the popup after opening the dashboard
                setTimeout(() => window.close(), 500);
            }
        });
    }

    showStatus(message) {
        this.elements.statusText.textContent = message;
    }

    truncateUrl(url, maxLength = 50) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExtractlyPopup();
});
