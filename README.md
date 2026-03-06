# Production-Ready Incremental Export System (CDC)

Build a robust, containerized data export system that uses Change Data Capture (CDC) principles with watermarking to efficiently synchronize large datasets.

## 🚀 Overview

This system provides a high-performance REST API for exporting user data using a high-water mark strategy. It handles full, incremental, and delta exports asynchronously, making it suitable for production environments with millions of records.

## 🛠️ Key Features

- **Asynchronous Export Jobs**: Immediate API response with background processing.
- **Change Data Capture (CDC)**: Efficient delta tracking using `updated_at` watermarking.
- **Soft Delete Support**: Correctly handles and flags deleted records in exports.
- **Auto-Seeding**: Idempotent script generates 100,000 realistic user records on startup.
- **Containerized**: Fully orchestrated with Docker and Docker Compose.
- **Robust Testing**: Comprehensive test suite achieving >70% code coverage.

## 📁 Project Structure

- `src/`: Core application source code (Fastify, TypeScript).
- `seeds/`: Database schema and idempotent seeding script.
- `tests/`: Integration and unit tests.
- `output/`: Volume-mounted directory for CSV exports.
- `Dockerfile` & `docker-compose.yml`: Infrastructure configuration.

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose installed.

### Setup & Running

1. **Clone the repository.**
2. **Setup environment variables**:
   ```bash
   cp .env.example .env
   ```
3. **Start the system**:
   ```bash
   docker-compose up --build
   ```
   The database will automatically initialize and seed 100,000 users.

## 🔌 API Documentation

All export endpoints require the `X-Consumer-ID` header to track watermarks independently.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Service health status. |
| `/exports/full` | `POST` | Dumps all non-deleted rows. |
| `/exports/incremental` | `POST` | Exports rows changed since last watermark. |
| `/exports/delta` | `POST` | Includes operation type (INSERT, UPDATE, DELETE). |
| `/exports/watermark` | `GET` | Retrieves current watermark for a consumer. |

## 🧪 Testing

Run the test suite and generate a coverage report:

```bash
npm test
```

## 📝 Design Principles

- **Atomicity**: Watermarks are updated only after successful CSV generation.
- **Scalability**: Background jobs prevent API blocking during large exports.
- **Idempotency**: Seeding and infrastructure setup can be run multiple times safely.
