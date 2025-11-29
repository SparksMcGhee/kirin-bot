import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

export class FileOutput {
  private outputDir: string;
  private logger: Logger;

  constructor(outputDir: string, logger: Logger) {
    this.outputDir = outputDir;
    this.logger = logger;
  }

  async writeSummary(summary: string, filename: string): Promise<void> {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      const filePath = path.join(this.outputDir, filename);
      
      // Add timestamp to summary
      const timestamp = new Date().toISOString();
      const content = `Generated: ${timestamp}\n\n${summary}\n`;

      // Write summary to file
      await fs.writeFile(filePath, content, 'utf-8');

      this.logger.info(`Successfully wrote summary to ${filePath}`);
    } catch (error) {
      this.logger.error('Error writing summary to file:', error);
      throw error;
    }
  }
}

