// Google Sheets configuration
const SPREADSHEET_ID = '1ls3lAzoKo3OTLW5JOCwc21LVKx-p0PCFeidrfXkptME';
const SHEET_ID = '1361346904';

// API endpoint for CSV export
const SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_ID}`;

// DOM elements
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const announcementsElement = document.getElementById('announcements');
const errorMessageElement = document.getElementById('error-message');
const lastUpdatedElement = document.getElementById('last-updated');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadAnnouncements();
});

// Function to load announcements from Google Sheets
async function loadAnnouncements() {
    showLoading();
    
    try {
        // Try to fetch from Google Sheets first
        const response = await fetch(SHEETS_CSV_URL, {
            mode: 'cors',
            headers: {
                'Accept': 'text/csv',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        const announcements = parseCSV(csvText);
        
        if (announcements.length === 0) {
            throw new Error('No announcements found in the spreadsheet.');
        }
        
        displayAnnouncements(announcements);
        updateLastUpdatedTime();
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        
        // Show CORS-specific error message with helpful information
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            showCORSError();
        } else {
            showError(error.message);
        }
    }
}

// Function to parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
        return [];
    }
    
    // Parse header row to get column indices
    const headers = parseCSVRow(lines[0]);
    const dateIndex = findColumnIndex(headers, ['date', 'timestamp', 'created', 'published']);
    const titleIndex = findColumnIndex(headers, ['title', 'subject', 'announcement', 'heading']);
    const contentIndex = findColumnIndex(headers, ['content', 'description', 'message', 'body', 'details']);
    const priorityIndex = findColumnIndex(headers, ['priority', 'importance', 'level']);
    
    const announcements = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        
        if (row.length === 0 || !row[titleIndex] || !row[contentIndex]) {
            continue; // Skip empty or incomplete rows
        }
        
        const announcement = {
            date: row[dateIndex] || new Date().toISOString(),
            title: row[titleIndex].trim(),
            content: row[contentIndex].trim(),
            priority: row[priorityIndex] ? row[priorityIndex].toLowerCase().trim() : 'medium',
            id: `announcement-${i}-${Date.now()}`
        };
        
        // Parse and validate date
        announcement.parsedDate = parseDate(announcement.date);
        
        announcements.push(announcement);
    }
    
    // Sort announcements by date (latest first)
    announcements.sort((a, b) => b.parsedDate - a.parsedDate);
    
    return announcements;
}

// Function to parse a single CSV row, handling quoted fields
function parseCSVRow(row) {
    const result = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    result.push(currentField);
    return result;
}

// Function to find column index by possible names
function findColumnIndex(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim();
        if (possibleNames.some(name => header.includes(name))) {
            return i;
        }
    }
    return 0; // Default to first column if not found
}

// Function to parse various date formats
function parseDate(dateString) {
    if (!dateString) return new Date();
    
    // Try parsing as ISO date first
    let date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        // Try common date formats
        const formats = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY or DD/MM/YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
            /(\d{1,2})-(\d{1,2})-(\d{4})/     // MM-DD-YYYY or DD-MM-YYYY
        ];
        
        for (const format of formats) {
            const match = dateString.match(format);
            if (match) {
                // Assume MM/DD/YYYY format for ambiguous dates
                date = new Date(match[3], match[1] - 1, match[2]);
                if (!isNaN(date.getTime())) break;
            }
        }
    }
    
    // If still invalid, use current date
    if (isNaN(date.getTime())) {
        date = new Date();
    }
    
    return date;
}

// Function to display announcements
function displayAnnouncements(announcements) {
    announcementsElement.innerHTML = '';
    
    announcements.forEach((announcement, index) => {
        const card = createAnnouncementCard(announcement, index === 0);
        announcementsElement.appendChild(card);
    });
    
    showAnnouncements();
}

// Function to create an announcement card
function createAnnouncementCard(announcement, isLatest) {
    const card = document.createElement('div');
    card.className = `announcement-card ${isLatest ? 'latest' : ''} priority-${announcement.priority}`;
    card.id = announcement.id;
    
    const formattedDate = formatDate(announcement.parsedDate);
    const formattedContent = formatContent(announcement.content);
    
    card.innerHTML = `
        <div class="announcement-header">
            <h2 class="announcement-title">
                ${escapeHtml(announcement.title)}
                ${isLatest ? '<span class="latest-badge">Latest</span>' : ''}
            </h2>
            <span class="announcement-date">${formattedDate}</span>
        </div>
        <div class="announcement-content">
            ${formattedContent}
        </div>
    `;
    
    return card;
}

// Function to format date for display
function formatDate(date) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    };
    
    return date.toLocaleDateString('en-US', options);
}

// Function to format content with basic HTML support
function formatContent(content) {
    if (!content) return '';
    
    // Convert line breaks to paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim());
    
    return paragraphs.map(paragraph => {
        const escaped = escapeHtml(paragraph.trim());
        // Convert URLs to links
        const withLinks = escaped.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        return `<p>${withLinks}</p>`;
    }).join('');
}

// Function to escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to show loading state
function showLoading() {
    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
    announcementsElement.classList.add('hidden');
}

// Function to show error state
function showError(message) {
    errorMessageElement.textContent = message;
    loadingElement.classList.add('hidden');
    errorElement.classList.remove('hidden');
    announcementsElement.classList.add('hidden');
}

// Function to show CORS-specific error with helpful information
function showCORSError() {
    errorMessageElement.innerHTML = `
        <strong>Connection Issue:</strong> Unable to fetch data from Google Sheets.<br><br>
        <strong>For GitHub Pages deployment:</strong> This typically works when deployed to GitHub Pages due to different CORS policies.<br><br>
        <strong>For local testing:</strong> The Google Sheet needs to be publicly accessible and may require additional CORS configuration.
    `;
    loadingElement.classList.add('hidden');
    errorElement.classList.remove('hidden');
    announcementsElement.classList.add('hidden');
}

// Function to show announcements
function showAnnouncements() {
    loadingElement.classList.add('hidden');
    errorElement.classList.add('hidden');
    announcementsElement.classList.remove('hidden');
}

// Function to update last updated time
function updateLastUpdatedTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };
    
    lastUpdatedElement.textContent = now.toLocaleDateString('en-US', options);
}

// Auto-refresh every 5 minutes
setInterval(loadAnnouncements, 5 * 60 * 1000);