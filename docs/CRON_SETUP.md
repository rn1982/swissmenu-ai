# SwissMenu AI - Cron Job Setup Guide

## ✅ Current Status
The automatic scraping cron jobs have been successfully installed and will run daily at:
- **3:00 AM** - First scraping run
- **4:00 AM** - Second scraping run  
- **5:00 AM** - Third scraping run

Each run scrapes one category in rotation to avoid overwhelming the Migros servers.

## 📊 Monitoring the Scraper

### Check Scraping Statistics
```bash
npm run scrape:scheduled stats
```

### View Recent Logs
```bash
tail -f logs/scraping.log
```

### View Cron Execution Logs
```bash
tail -f logs/cron.log
```

### Reset Statistics
```bash
npm run scrape:scheduled reset
```

## 🔧 Managing Cron Jobs

### View Current Cron Jobs
```bash
crontab -l
```

### Edit Cron Jobs
```bash
crontab -e
```

### Remove All Cron Jobs
```bash
crontab -r
```

### Reinstall Cron Jobs
```bash
crontab /Users/Home/swissmenu-ai/crontab-swissmenu.txt
```

## 📈 Expected Results

With 9 categories and 3 runs per day:
- All categories will be scraped every 3 days
- The scraper uses intelligent rotation to ensure even coverage
- Fallback database ensures the app always has products available
- Real scraped data will replace fallback data when successful

## 🚨 Troubleshooting

### Cron Not Running
1. Check if cron service is enabled on macOS:
   ```bash
   sudo launchctl list | grep cron
   ```

2. Check system logs:
   ```bash
   log show --predicate 'process == "cron"' --last 1h
   ```

### Permission Issues
Make sure the logs directory has write permissions:
```bash
chmod 755 /Users/Home/swissmenu-ai/logs
```

### Manual Test
Run a manual scrape to test:
```bash
cd /Users/Home/swissmenu-ai && npm run scrape:scheduled
```

## 🔄 Alternative: PM2 Setup

If you prefer PM2 over cron for more control:

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
pm2 ecosystem

# Start the scheduled scraper
pm2 start ecosystem.config.js --only scraper

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```