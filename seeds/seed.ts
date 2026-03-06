import { Client } from 'pg';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydatabase';
const BATCH_SIZE = 5000;
const TOTAL_USERS = 100000;

async function seed() {
    const client = new Client({
        connectionString: DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database for seeding...');

        const countRes = await client.query('SELECT COUNT(*) FROM users');
        const currentCount = parseInt(countRes.rows[0].count, 10);

        if (currentCount >= TOTAL_USERS) {
            console.log(`Database already seeded with ${currentCount} users. Skipping.`);
            return;
        }

        console.log(`Seeding ${TOTAL_USERS - currentCount} users...`);

        const startTime = Date.now();

        for (let i = currentCount; i < TOTAL_USERS; i += BATCH_SIZE) {
            const values: any[] = [];
            const placeholders: string[] = [];

            for (let j = 0; j < Math.min(BATCH_SIZE, TOTAL_USERS - i); j++) {
                const name = faker.person.fullName();
                const email = faker.internet.email();
                const is_deleted = Math.random() < 0.01;
                
                const createdAt = faker.date.past({ days: 30 });
                const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

                const offset = j * 5;
                placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
                values.push(name, email, createdAt, updatedAt, is_deleted);
            }

            const query = `
                INSERT INTO users (name, email, created_at, updated_at, is_deleted)
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (email) DO NOTHING
            `;

            await client.query(query, values);
            process.stdout.write(`\rProgress: ${i + placeholders.length}/${TOTAL_USERS}`);
        }

        console.log(`\nSeeding completed in ${(Date.now() - startTime) / 1000}s`);

    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        await client.end();
    }
}

seed();
