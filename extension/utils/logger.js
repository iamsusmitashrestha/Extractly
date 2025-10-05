// Simple logger for Chrome Extension
class ExtensionLogger {
    constructor() {
        this.isDevelopment = true; // Can be configured based on environment
    }

    info(message, ...args) {
        if (this.isDevelopment) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }

    error(message, ...args) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }

    warn(message, ...args) {
        if (this.isDevelopment) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }

    debug(message, ...args) {
        if (this.isDevelopment) {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
}

// Create and export logger instance
const logger = new ExtensionLogger();

// For browser environments, attach to window
if (typeof window !== 'undefined') {
    window.logger = logger;
}

// For Node.js-like environments (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
}
