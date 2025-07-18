import { CronJob } from 'cron'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const execAsync = promisify(exec)

/**
 * URL Maintenance Scheduler
 * 
 * Schedules:
 * - Daily: Quick health check (sample of 100 products)
 * - Weekly: Full URL validation and fixing
 * - Monthly: Complete database URL audit
 */
class UrlMaintenanceScheduler {
  private jobs: CronJob[] = []

  constructor() {
    this.initializeJobs()
  }

  private initializeJobs() {
    // Daily health check - 2 AM every day
    const dailyHealthCheck = new CronJob(
      '0 2 * * *',
      async () => {
        console.log('🏥 Running daily URL health check...')
        try {
          const { stdout, stderr } = await execAsync(
            'npx ts-node src/scripts/url-health-check.ts --threshold=85'
          )
          console.log('Daily health check completed:', stdout)
          if (stderr) console.error('Errors:', stderr)
        } catch (error: any) {
          console.error('Daily health check failed:', error.message)
          // Health check returns non-zero exit code if threshold not met
          if (error.code === 1) {
            console.log('Health check threshold not met, triggering URL fix...')
            await this.runUrlFix()
          }
        }
      },
      null,
      false, // Don't start automatically
      'Europe/Zurich'
    )

    // Weekly URL fix - Sunday 3 AM
    const weeklyUrlFix = new CronJob(
      '0 3 * * 0',
      async () => {
        console.log('🔧 Running weekly URL fix...')
        await this.runUrlFix()
      },
      null,
      false,
      'Europe/Zurich'
    )

    // Monthly full audit - 1st of month, 4 AM
    const monthlyAudit = new CronJob(
      '0 4 1 * *',
      async () => {
        console.log('📊 Running monthly full URL audit...')
        try {
          // Run full health check
          const { stdout: healthOutput } = await execAsync(
            'npx ts-node src/scripts/url-health-check.ts --full'
          )
          console.log('Full health check completed:', healthOutput)

          // Run URL fix
          await this.runUrlFix()

          // Re-scrape products with persistent issues
          const { stdout: scrapeOutput } = await execAsync(
            'npx ts-node src/lib/migros-scraper-validated.ts'
          )
          console.log('Re-scraping completed:', scrapeOutput)
        } catch (error) {
          console.error('Monthly audit failed:', error)
        }
      },
      null,
      false,
      'Europe/Zurich'
    )

    this.jobs = [dailyHealthCheck, weeklyUrlFix, monthlyAudit]
  }

  private async runUrlFix() {
    try {
      const { stdout, stderr } = await execAsync(
        'npx ts-node src/scripts/fix-product-urls.ts'
      )
      console.log('URL fix completed:', stdout)
      if (stderr) console.error('Errors:', stderr)
    } catch (error) {
      console.error('URL fix failed:', error)
    }
  }

  start() {
    console.log('🚀 Starting URL maintenance scheduler...')
    console.log('Schedules:')
    console.log('  - Daily health check: 2:00 AM')
    console.log('  - Weekly URL fix: Sunday 3:00 AM')
    console.log('  - Monthly full audit: 1st of month, 4:00 AM')
    console.log('')

    this.jobs.forEach(job => job.start())
    
    // Also run immediate health check on startup
    console.log('Running initial health check...')
    execAsync('npx ts-node src/scripts/url-health-check.ts')
      .then(({ stdout }) => console.log('Initial check:', stdout))
      .catch(err => console.error('Initial check failed:', err))
  }

  stop() {
    console.log('Stopping URL maintenance scheduler...')
    this.jobs.forEach(job => job.stop())
  }

  /**
   * Run specific maintenance task manually
   */
  async runTask(task: 'health-check' | 'fix-urls' | 'full-audit') {
    switch (task) {
      case 'health-check':
        console.log('Running manual health check...')
        await execAsync('npx ts-node src/scripts/url-health-check.ts')
        break
        
      case 'fix-urls':
        console.log('Running manual URL fix...')
        await this.runUrlFix()
        break
        
      case 'full-audit':
        console.log('Running manual full audit...')
        await execAsync('npx ts-node src/scripts/url-health-check.ts --full')
        await this.runUrlFix()
        break
    }
  }
}

// Export for use
export default UrlMaintenanceScheduler

// Run if called directly
if (require.main === module) {
  const scheduler = new UrlMaintenanceScheduler()
  
  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    scheduler.stop()
    process.exit(0)
  })
  
  // Check for manual task argument
  const task = process.argv[2]
  if (task && ['health-check', 'fix-urls', 'full-audit'].includes(task)) {
    scheduler.runTask(task as any)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err)
        process.exit(1)
      })
  } else {
    // Start scheduler
    scheduler.start()
    console.log('Scheduler is running. Press Ctrl+C to stop.')
  }
}