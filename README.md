# STR Announcements - GitHub Pages Site

A modern, responsive GitHub Pages site that displays STR announcements from a Google Sheets data source.

## Features

- 📋 **Live Google Sheets Integration** - Automatically pulls data from the configured Google Sheet
- 📅 **Latest First Sorting** - Displays announcements in reverse chronological order
- 🎨 **Modern UI Design** - Clean, professional interface with gradient header and card layout
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🚦 **Priority System** - Color-coded announcements based on priority level
- 🔄 **Auto-refresh** - Updates every 5 minutes automatically
- ⚡ **Error Handling** - Graceful error states with retry functionality
- 🏷️ **Latest Badge** - Highlights the most recent announcement

## Google Sheets Configuration

The site is configured to read from:
- **Spreadsheet ID**: `1ls3lAzoKo3OTLW5JOCwc21LVKx-p0PCFeidrfXkptME`
- **Sheet ID**: `1361346904`

### Expected Sheet Structure

The Google Sheet should have columns for:
- **Date/Timestamp** - When the announcement was published
- **Title/Subject** - The announcement headline
- **Content/Description** - The full announcement text
- **Priority** (optional) - High, Medium, or Low priority level

## Files

- `index.html` - Main page with live Google Sheets integration
- `demo.html` - Demo page with sample announcements
- `styles.css` - Modern CSS styling with responsive design
- `script.js` - JavaScript for fetching and displaying announcements
- `_config.yml` - GitHub Pages configuration

## Deployment

This site is designed to be deployed on GitHub Pages. The live integration with Google Sheets works best when deployed to GitHub Pages due to CORS policies.

## Priority Color Coding

- 🔴 **High Priority** - Red left border
- 🟡 **Medium Priority** - Yellow left border  
- 🟢 **Low Priority** - Green left border

## Local Development

For local testing, use the demo.html file or serve with any static web server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` for the live version or `http://localhost:8080/demo.html` for the demo.