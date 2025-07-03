# Proxy Configuration for SwissMenu AI Scraper

## Why Use Proxies?

Migros may block or rate-limit IP addresses that make too many requests. Using proxies helps:
- Avoid IP blocks
- Rotate through different Swiss IPs
- Improve scraping success rates
- Access region-restricted content

## Setting Up Proxies

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Basic proxy configuration
PROXY_URL=http://swiss-proxy.example.com:8080
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password

# Multiple proxies (for rotation)
PROXY_LIST=http://proxy1.ch:8080,http://proxy2.ch:8080,http://proxy3.ch:8080
```

### 2. Recommended Proxy Services

#### For Testing (Free)
- **ProxyScrape**: Free Swiss proxies (limited reliability)
- **FreeProxyList**: Community-contributed proxies

#### For Production (Paid)
- **Bright Data**: Residential Swiss IPs, high success rate
- **Oxylabs**: Swiss datacenter and residential proxies
- **SmartProxy**: Affordable Swiss proxy rotation
- **ProxyEmpire**: Swiss mobile and residential IPs

### 3. Swiss-Specific Proxy Tips

1. **Use Swiss IPs**: Better success with .ch domains
2. **Residential > Datacenter**: Less likely to be blocked
3. **Rotate IPs**: Don't use same IP repeatedly
4. **Respect Rate Limits**: Even with proxies, be respectful

### 4. Testing Your Proxy

```bash
# Test proxy connection
curl -x http://your-proxy:8080 https://www.migros.ch/fr

# Test with authentication
curl -x http://username:password@your-proxy:8080 https://www.migros.ch/fr
```

### 5. Proxy Rotation Implementation

For automatic proxy rotation, update your `.env.local`:

```bash
# Comma-separated list of proxies
PROXY_LIST=http://proxy1.ch:8080,http://proxy2.ch:8080,http://proxy3.ch:8080
PROXY_USERNAME=shared_username
PROXY_PASSWORD=shared_password

# Rotation strategy
PROXY_ROTATION=round-robin  # or 'random'
```

### 6. Monitoring Proxy Performance

The scheduled scraper tracks success rates per proxy:

```bash
# View proxy statistics
npm run scrape:scheduled stats

# Check logs for proxy performance
tail -f logs/scraping.log | grep proxy
```

### 7. Troubleshooting

**Proxy Connection Failed**
- Check proxy URL format: `http://host:port`
- Verify credentials are correct
- Test proxy outside the app first

**Still Getting Blocked**
- Try residential proxies instead of datacenter
- Reduce request frequency
- Use Swiss-based proxies only

**Slow Performance**
- Choose proxies geographically close to Switzerland
- Use premium proxy services
- Implement connection pooling

## Best Practices

1. **Start without proxies** - Test if you even need them
2. **Use sparingly** - Only when getting blocked
3. **Monitor costs** - Residential proxies can be expensive
4. **Respect robots.txt** - Even with proxies
5. **Cache aggressively** - Reduce need for scraping

## Legal Considerations

- Always respect website terms of service
- Use proxies for legitimate purposes only
- Consider reaching out to Migros for API access
- Comply with Swiss data protection laws

Remember: The fallback database ensures your app works even without scraping!