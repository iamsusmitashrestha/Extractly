// Exractly Records Browser JavaScript

class RecordsBrowser {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageLimit = 10;
        this.currentSearch = '';
        this.currentFilters = {
            status: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadRecords();
        this.loadStats();
    }

    initializeElements() {
        // Search elements
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Filter elements
        this.statusFilter = document.getElementById('statusFilter');
        this.sortBySelect = document.getElementById('sortBy');
        this.sortOrderSelect = document.getElementById('sortOrder');
        
        // Display elements
        this.recordsList = document.getElementById('recordsList');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.errorMessage = document.getElementById('errorMessage');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Pagination elements
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.pageInfo = document.getElementById('pageInfo');
        
        // Stats elements
        this.totalRecords = document.getElementById('totalRecords');
        this.successfulRecords = document.getElementById('successfulRecords');
        
        // Modal elements
        this.recordModal = document.getElementById('recordModal');
        this.modalBody = document.getElementById('modalBody');
        this.closeModal = document.getElementById('closeModal');
    }

    attachEventListeners() {
        // Search functionality
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.clearBtn.addEventListener('click', () => this.clearSearch());
        
        // Filter functionality
        this.statusFilter.addEventListener('change', () => this.handleFilterChange());
        this.sortBySelect.addEventListener('change', () => this.handleFilterChange());
        this.sortOrderSelect.addEventListener('change', () => this.handleFilterChange());
        
        // Pagination
        this.prevBtn.addEventListener('click', () => this.goToPreviousPage());
        this.nextBtn.addEventListener('click', () => this.goToNextPage());
        
        // Refresh
        this.refreshBtn.addEventListener('click', () => this.refresh());
        
        // Modal
        this.closeModal.addEventListener('click', () => this.closeRecordModal());
        this.recordModal.addEventListener('click', (e) => {
            if (e.target === this.recordModal) this.closeRecordModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeRecordModal();
        });
    }

    async loadRecords() {
        try {
            this.showLoading();
            this.hideError();
            
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageLimit.toString()
            });
            
            // Add search if present
            if (this.currentSearch) {
                params.append('search', this.currentSearch);
            }
            
            // Add filters
            if (this.currentFilters.status) {
                params.append('status', this.currentFilters.status);
            }
            
            const response = await fetch(`${this.apiBaseUrl}/records?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.displayRecords(data.records);
            this.updatePagination(data.pagination);
            
        } catch (error) {
            console.error('Error loading records:', error);
            this.showError(`Failed to load records: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async loadStats() {
        try {
            // Get total count
            const totalResponse = await fetch(`${this.apiBaseUrl}/records?limit=1`);
            if (totalResponse.ok) {
                const totalData = await totalResponse.json();
                this.totalRecords.textContent = totalData.pagination.total;
            }
            
            // Get successful count (completed status)
            const successResponse = await fetch(`${this.apiBaseUrl}/records?status=completed&limit=1`);
            if (successResponse.ok) {
                const successData = await successResponse.json();
                this.successfulRecords.textContent = successData.pagination.total;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.totalRecords.textContent = 'Error';
            this.successfulRecords.textContent = 'Error';
        }
    }

    displayRecords(records) {
        if (!records || records.length === 0) {
            this.recordsList.innerHTML = `
                <div class="empty-state">
                    <h3>No Records Found</h3>
                    <p>No extraction records match your current search criteria.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
                </div>
            `;
            return;
        }

        this.recordsList.innerHTML = records.map(record => this.createRecordCard(record)).join('');
        
        // Add click listeners to record cards
        document.querySelectorAll('.record-card').forEach(card => {
            card.addEventListener('click', () => {
                const recordId = card.dataset.recordId;
                this.showRecordDetails(recordId);
            });
        });
    }

    createRecordCard(record) {
        const createdDate = new Date(record.createdAt).toLocaleString();
        const fieldsCount = record.parsedFields ? record.parsedFields.length : 0;
        
        return `
            <div class="record-card" data-record-id="${record.id}">
                <div class="record-header">
                    <div class="record-url">${this.truncateUrl(record.url)}</div>
                    <div class="record-status status-${record.processingStatus}">
                        ${record.processingStatus}
                    </div>
                </div>
                <div class="record-instruction">
                    "${record.instruction}"
                </div>
                <div class="record-meta">
                    <span class="record-date">${createdDate}</span>
                    <span class="record-fields">${fieldsCount} fields extracted</span>
                </div>
            </div>
        `;
    }

    async showRecordDetails(recordId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/records/${recordId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const record = await response.json();
            this.displayRecordModal(record);
            
        } catch (error) {
            console.error('Error loading record details:', error);
            this.showError(`Failed to load record details: ${error.message}`);
        }
    }

    displayRecordModal(record) {
        const createdDate = new Date(record.createdAt).toLocaleString();
        const updatedDate = new Date(record.updatedAt).toLocaleString();
        
        let extractedDataHtml = '';
        if (record.extractedData && record.parsedFields) {
            extractedDataHtml = `
                <div class="detail-section">
                    <h4>Extracted Data</h4>
                    <div class="extracted-data">
                        ${record.parsedFields.map(field => {
                            const value = record.extractedData[field];
                            const confidence = record.confidenceScores ? record.confidenceScores[field] : 0;
                            const confidencePercent = Math.round(confidence * 100);
                            
                            return `
                                <div class="data-field">
                                    <div class="field-name">${field}</div>
                                    <div class="field-value">${value || 'Not found'}</div>
                                    <div class="field-confidence">
                                        Confidence: ${confidencePercent}%
                                        <div class="confidence-bar">
                                            <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        let errorHtml = '';
        if (record.errorMessage) {
            errorHtml = `
                <div class="detail-section">
                    <h4>Error Message</h4>
                    <div class="detail-content" style="border-left-color: #e53e3e; background: #fed7d7;">
                        ${record.errorMessage}
                    </div>
                </div>
            `;
        }
        
        this.modalBody.innerHTML = `
            <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-content">
                    <p><strong>ID:</strong> ${record.id}</p>
                    <p><strong>URL:</strong> <a href="${record.url}" target="_blank">${record.url}</a></p>
                    <p><strong>Status:</strong> <span class="record-status status-${record.processingStatus}">${record.processingStatus}</span></p>
                    <p><strong>Created:</strong> ${createdDate}</p>
                    <p><strong>Updated:</strong> ${updatedDate}</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Instruction</h4>
                <div class="detail-content">
                    "${record.instruction}"
                </div>
            </div>
            
            ${extractedDataHtml}
            ${errorHtml}
            
            <div class="detail-section">
                <h4>HTML Content</h4>
                <div class="detail-content">
                    <p><strong>Size:</strong> ${record.htmlContent ? record.htmlContent.length.toLocaleString() : 0} characters</p>
                    <details>
                        <summary>View HTML Content</summary>
                        <pre style="max-height: 300px; overflow-y: auto; background: #f7fafc; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 0.8rem;">${this.escapeHtml(record.htmlContent || '')}</pre>
                    </details>
                </div>
            </div>
        `;
        
        this.recordModal.style.display = 'flex';
    }

    closeRecordModal() {
        this.recordModal.style.display = 'none';
    }

    handleSearch() {
        this.currentSearch = this.searchInput.value.trim();
        this.currentPage = 1;
        this.loadRecords();
    }

    clearSearch() {
        this.searchInput.value = '';
        this.currentSearch = '';
        this.currentPage = 1;
        this.loadRecords();
    }

    handleFilterChange() {
        this.currentFilters.status = this.statusFilter.value;
        this.currentFilters.sortBy = this.sortBySelect.value;
        this.currentFilters.sortOrder = this.sortOrderSelect.value;
        this.currentPage = 1;
        this.loadRecords();
    }

    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadRecords();
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadRecords();
        }
    }

    updatePagination(pagination) {
        this.totalPages = pagination.pages;
        this.currentPage = pagination.page;
        
        this.pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages}`;
        
        this.prevBtn.disabled = pagination.page <= 1;
        this.nextBtn.disabled = pagination.page >= pagination.pages;
    }

    refresh() {
        this.loadRecords();
        this.loadStats();
    }

    showLoading() {
        this.loadingIndicator.style.display = 'block';
        this.recordsList.style.display = 'none';
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
        this.recordsList.style.display = 'block';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    truncateUrl(url, maxLength = 60) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RecordsBrowser();
});

// Handle connection errors gracefully
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show user-friendly error for network issues
    if (event.reason.message.includes('fetch')) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = 'Unable to connect to the server. Please ensure the backend is running on localhost:3000';
            errorDiv.style.display = 'block';
        }
    }
});
