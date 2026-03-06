import fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import * as dotenv from 'dotenv';
import { healthRoutes } from './routes/health';
import { exportRoutes } from './routes/exports';

dotenv.config();

const server = fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty'
        }
    }
});

server.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydatabase'
});

server.register(healthRoutes);
server.register(exportRoutes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

const start = async () => {
    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server listening on http://0.0.0.0:${PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
