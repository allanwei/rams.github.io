// Google Sheets configuration
const SPREADSHEET_ID = '1ls3lAzoKo3OTLW5JOCwc21LVKx-p0PCFeidrfXkptME';

// Sheet names for each month
const SHEET_NAMES = [
    'September', 'October', 'November', 'December', 'January',
    'February', 'March', 'April', 'May', 'June'
];

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
        const allAnnouncements = [];
        
        // Fetch announcements from all specified sheets
        for (const sheetName of SHEET_NAMES) {
            const jsonUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

            try {
                const response = await fetch(jsonUrl);
                if (!response.ok) {
                    console.warn(`Could not fetch sheet "${sheetName}". Status: ${response.status}`);
                    continue;
                }

                const jsonpText = await response.text();
                const announcements = parseJSON(jsonpText);
                allAnnouncements.push(...announcements);

            } catch (sheetError) {
                console.error(`Error fetching or parsing sheet "${sheetName}":`, sheetError);
            }
        }
        
        if (allAnnouncements.length === 0) {
            throw new Error('No announcements found in any of the sheets.');
        }
        
        // Sort all announcements by date (latest first)
        allAnnouncements.sort((a, b) => b.parsedDate - a.parsedDate);

        displayAnnouncements(allAnnouncements);
        updateLastUpdatedTime();
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        
        // Show a generic but helpful error message
        showError('Could not load announcements. Please check the spreadsheet configuration and network connection.');
    }
}

// Function to parse JSONP data from gviz endpoint
function parseJSON(jsonpText) {
    // Extract JSON from the JSONP wrapper
    const jsonString = jsonpText.match(/google\.visualization\.Query\.setResponse\((.*)\)/s)[1];
    const data = JSON.parse(jsonString);

    if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        return [];
    }

    const cols = data.table.cols;
    const rows = data.table.rows;

    // Find column indices dynamically
    const dateIndex = cols.findIndex(c => c.label.toLowerCase().includes('date'));
    const contentIndex = cols.findIndex(c => c.label.toLowerCase().includes('description'));
    let titleIndex = cols.findIndex(c => c.label.toLowerCase().includes('club or activity'));
    if (titleIndex === -1) {
        titleIndex = cols.findIndex(c => c.label.toLowerCase().includes('teacher'));
    }

    if (dateIndex === -1 || contentIndex === -1 || titleIndex === -1) {
        return []; // Essential columns not found
    }

    const announcements = [];
    rows.forEach((row, i) => {
        if (!row.c || !row.c[dateIndex] || !row.c[contentIndex]) {
            return;
        }
        
        const dateVal = row.c[dateIndex] ? (row.c[dateIndex].f || row.c[dateIndex].v) : new Date().toISOString();
        const titleVal = row.c[titleIndex] ? (row.c[titleIndex].v || 'Announcement') : 'Announcement';
        const contentVal = row.c[contentIndex] ? (row.c[contentIndex].v || '') : '';

        // Skip empty rows
        if (!contentVal) return;

        const announcement = {
            date: dateVal,
            title: titleVal.trim(),
            content: contentVal.trim(),
            priority: 'medium',
            id: `announcement-${i}-${Date.now()}`
        };

        announcement.parsedDate = parseDate(announcement.date);
        announcements.push(announcement);
    });

    return announcements;
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