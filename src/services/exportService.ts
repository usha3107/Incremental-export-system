import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { stringify } from 'csv-stringify';
import * as fs from 'fs';
import * as path from 'path';
import { ExportJob, ExportType } from '../types';
import { WatermarkService } from './watermarkService';

export class ExportService {
    private watermarkService: WatermarkService;
    private outputDir = path.join(process.cwd(), 'output');

    constructor(private fastify: FastifyInstance) {
        this.watermarkService = new WatermarkService(fastify);
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async startExport(consumerId: string, exportType: ExportType): Promise<ExportJob> {
        const jobId = uuidv4();
        const timestamp = Date.now();
        const outputFilename = `${exportType}_${consumerId}_${timestamp}.csv`;
        const filePath = path.join(this.outputDir, outputFilename);

        const job: ExportJob = {
            jobId,
            status: 'started',
            exportType,
            outputFilename
        };

        this.runExportTask(job, consumerId, filePath).catch(err => {
            this.fastify.log.error(`Job ${jobId} failed: ${err.message}`);
        });

        return job;
    }

    private async runExportTask(job: ExportJob, consumerId: string, filePath: string) {
        const startTime = Date.now();
        this.fastify.log.info({ jobId: job.jobId, consumerId, exportType: job.exportType }, 'Export job started');

        try {
            const watermark = await this.watermarkService.getWatermark(consumerId);
            const lastExportedAt = watermark ? watermark.last_exported_at : new Date(0);

            let query = '';
            let params: any[] = [];

            if (job.exportType === 'full') {
                query = 'SELECT * FROM users WHERE is_deleted = FALSE ORDER BY updated_at ASC';
            } else if (job.exportType === 'incremental') {
                query = 'SELECT * FROM users WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at ASC';
                params = [lastExportedAt];
            } else if (job.exportType === 'delta') {
                query = `
                    SELECT 
                        CASE 
                            WHEN is_deleted = TRUE THEN 'DELETE'
                            WHEN created_at = updated_at THEN 'INSERT'
                            ELSE 'UPDATE'
                        END as operation,
                        * 
                    FROM users 
                    WHERE updated_at > $1 
                    ORDER BY updated_at ASC
                `;
                params = [lastExportedAt];
            }

            const { rows } = await this.fastify.pg.query(query, params);
            
            if (rows.length === 0) {
                await this.writeCsv(filePath, [], job.exportType);
                job.status = 'completed';
                job.rowsExported = 0;
                job.duration = Date.now() - startTime;
                this.fastify.log.info({ jobId: job.jobId, rowsExported: 0, duration: job.duration }, 'Export job completed (zero rows)');
                return;
            }

            await this.writeCsv(filePath, rows, job.exportType);

            const maxUpdatedAt = rows[rows.length - 1].updated_at;
            await this.watermarkService.updateWatermark(consumerId, maxUpdatedAt);

            job.status = 'completed';
            job.rowsExported = rows.length;
            job.duration = Date.now() - startTime;

            this.fastify.log.info({ jobId: job.jobId, rowsExported: job.rowsExported, duration: job.duration }, 'Export job completed');

        } catch (err: any) {
            job.status = 'failed';
            job.error = err.message;
            this.fastify.log.error({ jobId: job.jobId, error: err.message }, 'Export job failed');
            throw err;
        }
    }

    private async writeCsv(filePath: string, rows: any[], exportType: ExportType): Promise<void> {
        return new Promise((resolve, reject) => {
            const writableStream = fs.createWriteStream(filePath);
            const stringifier = stringify({ header: true });

            stringifier.on('error', (err) => reject(err));
            writableStream.on('error', (err) => reject(err));
            writableStream.on('finish', () => resolve());

            stringifier.pipe(writableStream);

            for (const row of rows) {
                stringifier.write(row);
            }

            stringifier.end();
        });
    }
}
