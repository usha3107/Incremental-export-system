import { FastifyInstance } from 'fastify';
import { ExportService } from '../services/exportService';
import { WatermarkService } from '../services/watermarkService';
import { ExportType } from '../types';

export async function exportRoutes(fastify: FastifyInstance) {
    const exportService = new ExportService(fastify);
    const watermarkService = new WatermarkService(fastify);

    const getConsumerId = (request: any) => {
        const consumerId = request.headers['x-consumer-id'] as string;
        if (!consumerId) {
            throw new Error('X-Consumer-ID header is required');
        }
        return consumerId;
    };

    fastify.post('/exports/full', async (request, reply) => {
        try {
            const consumerId = getConsumerId(request);
            const job = await exportService.startExport(consumerId, 'full');
            return reply.code(202).send(job);
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    fastify.post('/exports/incremental', async (request, reply) => {
        try {
            const consumerId = getConsumerId(request);
            const job = await exportService.startExport(consumerId, 'incremental');
            return reply.code(202).send(job);
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    fastify.post('/exports/delta', async (request, reply) => {
        try {
            const consumerId = getConsumerId(request);
            const job = await exportService.startExport(consumerId, 'delta');
            return reply.code(202).send(job);
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    fastify.get('/exports/watermark', async (request, reply) => {
        try {
            const consumerId = getConsumerId(request);
            const watermark = await watermarkService.getWatermark(consumerId);
            
            if (!watermark) {
                return reply.code(404).send({ error: 'Watermark not found for consumer' });
            }

            return {
                consumerId: watermark.consumer_id,
                lastExportedAt: watermark.last_exported_at
            };
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });
}
