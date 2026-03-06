export interface User {
    id: string;
    name: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}

export interface Watermark {
    id: number;
    consumer_id: string;
    last_exported_at: Date;
    updated_at: Date;
}

export type ExportType = 'full' | 'incremental' | 'delta';

export interface ExportJob {
    jobId: string;
    status: 'started' | 'completed' | 'failed';
    exportType: ExportType;
    outputFilename: string;
    rowsExported?: number;
    duration?: number;
    error?: string;
}
