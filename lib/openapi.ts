import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import * as SwaggerParser from 'swagger-parser';
import * as Cache from './cache';
import { InvalidOpenapiFile } from './errors';
import { CONFIG } from './config'

const cache = Cache.getInstance();

export const cacheOpenapi = async (openapiPath: string) => {
    try {
        const parsedOpenapi = await parseOpenapi(openapiPath);
        cache.set(CONFIG.OPENAPI_CACHE_KEY, parsedOpenapi);
    } catch (e) {
        throw e;
    }
}

export const parseOpenapi = async (openapiPath: string): Promise<OpenAPI.Document> => {
    try {
        return await SwaggerParser.parse(openapiPath);
    } catch (e) {
        throw new InvalidOpenapiFile();
    }
}

export const getOpenapiSchema = (url, method = 'get'): OpenAPIV3.SchemaObject => {
    const openapi: OpenAPIV3.Document = cache.get(CONFIG.OPENAPI_CACHE_KEY);

    const path = openapi.paths[url][method];
    const response = path.responses[200];
    const content = response.content['application/json'];
    const schema = content.schema;

    let ref

    if (schema?.type === 'array') {
        ref = schema.items.$ref;
    }

    ref = schema.$ref;

    if (!ref) {
        //
    }

    const paths = ref.split('/');
    const schemaName = paths[paths.length - 1];
    const schemaData = openapi.components.schemas[schemaName];

    if (!schemaData) {
        //
    }

    return schemaData as OpenAPIV3.SchemaObject;
}
