import fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from '../src/routes/health';
import { exportRoutes } from '../src/routes/exports';

describe('Incremental Export System API', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        app = fastify();
        
        (app as any).decorate('pg', {
            query: jest.fn()
        });

        await app.register(healthRoutes);
        await app.register(exportRoutes);
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('Health Endpoint', () => {
        it('GET /health should return 200', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/health'
            });
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).status).toBe('ok');
        });
    });

    describe('Watermark Endpoint', () => {
        it('GET /exports/watermark should return 404 if not found', async () => {
            (app.pg.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await app.inject({
                method: 'GET',
                url: '/exports/watermark',
                headers: { 'x-consumer-id': 'non-existent' }
            });
            expect(response.statusCode).toBe(404);
        });

        it('GET /exports/watermark should return 200 if found', async () => {
            const date = new Date();
            (app.pg.query as jest.Mock).mockResolvedValueOnce({ 
                rows: [{ consumer_id: 'test', last_exported_at: date }], 
                rowCount: 1 
            });

            const response = await app.inject({
                method: 'GET',
                url: '/exports/watermark',
                headers: { 'x-consumer-id': 'test' }
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.consumerId).toBe('test');
        });
    });

    describe('Export Endpoints', () => {
        it('POST /exports/full should return 202 and start job', async () => {
            (app.pg.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

            const response = await app.inject({
                method: 'POST',
                url: '/exports/full',
                headers: { 'x-consumer-id': 'consumer-1' }
            });
            expect(response.statusCode).toBe(202);
            const body = JSON.parse(response.body);
            expect(body.status).toBe('started');
            expect(body.exportType).toBe('full');
        });

        it('POST /exports/incremental should return 202', async () => {
            (app.pg.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ last_exported_at: new Date() }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await app.inject({
                method: 'POST',
                url: '/exports/incremental',
                headers: { 'x-consumer-id': 'consumer-1' }
            });
            expect(response.statusCode).toBe(202);
        });

        it('POST /exports/delta should return 202', async () => {
            (app.pg.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ last_exported_at: new Date() }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await app.inject({
                method: 'POST',
                url: '/exports/delta',
                headers: { 'x-consumer-id': 'consumer-1' }
            });
            expect(response.statusCode).toBe(202);
        });

        it('should return 400 if X-Consumer-ID is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/exports/full'
            });
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toContain('X-Consumer-ID');
        });
    });
});
