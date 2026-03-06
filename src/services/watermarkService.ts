import { FastifyInstance } from 'fastify';
import { Watermark } from '../types';

export class WatermarkService {
    constructor(private fastify: FastifyInstance) {}

    async getWatermark(consumerId: string): Promise<Watermark | null> {
        const result = await this.fastify.pg.query(
            'SELECT * FROM watermarks WHERE consumer_id = $1',
            [consumerId]
        );

        if (result.rowCount === 0) {
            return null;
        }

        return result.rows[0];
    }

    async updateWatermark(consumerId: string, lastExportedAt: Date, client?: any) {
        const db = client || this.fastify.pg;
        
        await db.query(
            `INSERT INTO watermarks (consumer_id, last_exported_at, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (consumer_id) DO UPDATE
             SET last_exported_at = EXCLUDED.last_exported_at,
                 updated_at = CURRENT_TIMESTAMP`,
            [consumerId, lastExportedAt]
        );
    }
}
