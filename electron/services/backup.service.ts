import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class BackupService {
  private dbPath: string
  private backupPath: string
  private maxBackups: number = 10

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.backupPath = path.join(app.getPath('userData'), 'backups')
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true })
    }
  }

  async createBackup(): Promise<{ success: boolean, backupFile?: string, error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFileName = `backup_${timestamp}.db`
      const backupFilePath = path.join(this.backupPath, backupFileName)

      // Copy database file
      await fs.promises.copyFile(this.dbPath, backupFilePath)

      // Clean old backups
      await this.cleanOldBackups()

      console.log(`Backup created: ${backupFilePath}`)
      return { success: true, backupFile: backupFilePath }
    } catch (error: any) {
      console.error('Backup error:', error)
      return { success: false, error: error.message }
    }
  }

  async restoreBackup(backupFile: string): Promise<{ success: boolean, error?: string }> {
    try {
      const backupFilePath = path.join(this.backupPath, backupFile)
      
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: 'Backup file not found' }
      }

      // Create a backup of current database before restore
      const tempBackup = this.dbPath + '.temp'
      await fs.promises.copyFile(this.dbPath, tempBackup)

      try {
        // Restore from backup
        await fs.promises.copyFile(backupFilePath, this.dbPath)
        
        // Delete temp backup
        await fs.promises.unlink(tempBackup)
        
        console.log(`Database restored from: ${backupFilePath}`)
        return { success: true }
      } catch (restoreError) {
        // Restore failed, rollback to temp backup
        await fs.promises.copyFile(tempBackup, this.dbPath)
        await fs.promises.unlink(tempBackup)
        throw restoreError
      }
    } catch (error: any) {
      console.error('Restore error:', error)
      return { success: false, error: error.message }
    }
  }

  async getBackupList(): Promise<Array<{ name: string, size: number, created: Date }>> {
    try {
      const files = await fs.promises.readdir(this.backupPath)
      const backups = []

      for (const file of files) {
        if (file.endsWith('.db')) {
          const filePath = path.join(this.backupPath, file)
          const stats = await fs.promises.stat(filePath)
          
          backups.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
          })
        }
      }

      // Sort by creation date, newest first
      backups.sort((a, b) => b.created.getTime() - a.created.getTime())

      return backups
    } catch (error) {
      console.error('Error listing backups:', error)
      return []
    }
  }

  private async cleanOldBackups(): Promise<void> {
    try {
      const backups = await this.getBackupList()
      
      if (backups.length > this.maxBackups) {
        // Delete oldest backups
        const toDelete = backups.slice(this.maxBackups)
        
        for (const backup of toDelete) {
          const filePath = path.join(this.backupPath, backup.name)
          await fs.promises.unlink(filePath)
          console.log(`Deleted old backup: ${backup.name}`)
        }
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error)
    }
  }

  async enableAutoBackup(intervalHours: number = 24): Promise<void> {
    // Create initial backup
    await this.createBackup()

    // Schedule periodic backups
    setInterval(async () => {
      await this.createBackup()
    }, intervalHours * 60 * 60 * 1000)
  }
}
