import { OpenAPI } from 'openapi-types';

export type Extension = 'xlsx' | 'pdf';
export type Type = 'table' | 'list';
export type Data = {
    [key: string]: any
}

export interface ConstructDocumentParams {
    data: Data | Data[]
    openapi: OpenAPI.Document,
    url: string,
    method: string,
    ext: Extension,
    type: Type
}
