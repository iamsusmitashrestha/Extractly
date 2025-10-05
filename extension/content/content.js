// Content script for Exractly Chrome Extension
// This script runs in the context of web pages

(function() {
    'use strict';

    // Simple logger for content script
    const logger = {
        info: (message, ...args) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args)
    };

    // Prevent multiple injections
    if (window.exractlyContentScript) {
        return;
    }
    window.exractlyContentScript = true;

    logger.info('Exractly content script loaded on:', window.location.href);

    // Listen for messages from popup or background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        logger.debug('Content script received message:', request.type);

        switch (request.type) {
            case 'GET_PAGE_CONTENT':
                handleGetPageContent(request, sendResponse);
                return true; // Keep message channel open

            case 'HIGHLIGHT_ELEMENTS':
                handleHighlightElements(request, sendResponse);
                return true;

            case 'CLEAN_HIGHLIGHTS':
                handleCleanHighlights(request, sendResponse);
                return true;

            default:
                logger.warn('Unknown message type in content script:', request.type);
                sendResponse({ error: 'Unknown message type' });
        }
    });

    // Handle getting page content
    function handleGetPageContent(request, sendResponse) {
        try {
            const content = {
                html: document.documentElement.outerHTML,
                url: window.location.href,
                title: document.title,
                meta: getPageMetadata(),
                text: getCleanText(),
                structure: getPageStructure()
            };

            sendResponse({ success: true, data: content });
        } catch (error) {
            logger.error('Error getting page content:', error);
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to get page content' 
            });
        }
    }

    // Handle highlighting elements (for future visual feedback)
    function handleHighlightElements(request, sendResponse) {
        try {
            const { selectors } = request;
            
            // Remove existing highlights
            cleanHighlights();

            // Add new highlights
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        element.classList.add('exractly-highlight');
                        element.style.outline = '2px solid #667eea';
                        element.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                    });
                } catch (e) {
                    logger.warn('Invalid selector:', selector);
                }
            });

            sendResponse({ success: true, highlighted: selectors.length });
        } catch (error) {
            logger.error('Error highlighting elements:', error);
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to highlight elements' 
            });
        }
    }

    // Handle cleaning highlights
    function handleCleanHighlights(request, sendResponse) {
        try {
            cleanHighlights();
            sendResponse({ success: true });
        } catch (error) {
            logger.error('Error cleaning highlights:', error);
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to clean highlights' 
            });
        }
    }

    // Helper function to get page metadata
    function getPageMetadata() {
        const meta = {};
        
        // Get meta tags
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            if (name && content) {
                meta[name] = content;
            }
        });

        // Get structured data
        const structuredData = [];
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                structuredData.push(data);
            } catch (e) {
                // Ignore invalid JSON
            }
        });

        if (structuredData.length > 0) {
            meta.structuredData = structuredData;
        }

        return meta;
    }

    // Helper function to get clean text content
    function getCleanText() {
        // Clone document to avoid modifying original
        const clone = document.cloneNode(true);
        
        // Remove script and style elements
        const unwanted = clone.querySelectorAll('script, style, noscript');
        unwanted.forEach(el => el.remove());
        
        // Get text content and clean it up
        const text = clone.body ? clone.body.textContent : clone.textContent;
        return text.replace(/\s+/g, ' ').trim();
    }

    // Helper function to get page structure information
    function getPageStructure() {
        const structure = {
            headings: [],
            links: [],
            images: [],
            forms: [],
            tables: []
        };

        // Get headings
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            structure.headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: heading.textContent.trim(),
                id: heading.id || null
            });
        });

        // Get links
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            structure.links.push({
                text: link.textContent.trim(),
                href: link.href,
                title: link.title || null
            });
        });

        // Get images
        const images = document.querySelectorAll('img[src]');
        images.forEach(img => {
            structure.images.push({
                src: img.src,
                alt: img.alt || null,
                title: img.title || null
            });
        });

        // Get forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || null,
                placeholder: input.placeholder || null
            }));
            
            structure.forms.push({
                action: form.action || null,
                method: form.method || 'get',
                inputs: inputs
            });
        });

        // Get tables
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rows = table.querySelectorAll('tr').length;
            
            structure.tables.push({
                headers: headers,
                rows: rows,
                caption: table.caption ? table.caption.textContent.trim() : null
            });
        });

        return structure;
    }

    // Helper function to clean highlights
    function cleanHighlights() {
        const highlighted = document.querySelectorAll('.exractly-highlight');
        highlighted.forEach(element => {
            element.classList.remove('exractly-highlight');
            element.style.outline = '';
            element.style.backgroundColor = '';
        });
    }

    // Clean up highlights when page is about to unload
    window.addEventListener('beforeunload', cleanHighlights);

    // Notify that content script is ready
    chrome.runtime.sendMessage({ 
        type: 'CONTENT_SCRIPT_READY', 
        url: window.location.href 
    }).catch(() => {
        // Ignore errors if background script is not ready
    });

})();
