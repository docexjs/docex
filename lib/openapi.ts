import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import * as SwaggerParser from 'swagger-parser';
import * as Cache from './cache';
import {
    InvalidOpenapiFile,
    NotDeclaredEndpointInOpenapi, NotFoundMethodForEndpointInOpenapi
} from './errors';
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

const getSchemaRef = (schema) => {
    if (schema?.type === 'array') {
        return schema.items.$ref;
    }

    return schema.$ref;
}

export const getOpenapiSchema = (url, method = 'get'): OpenAPIV3.SchemaObject => {
    const openapi: OpenAPIV3.Document = cache.get(CONFIG.OPENAPI_CACHE_KEY);

    const endpoint = openapi.paths[url];
    if (!endpoint) {
        throw new NotDeclaredEndpointInOpenapi(url);
    }

    const path = endpoint[method];
    if (!path) {
        throw new NotFoundMethodForEndpointInOpenapi();
    }

    const response = path.responses[200];
    const content = response.content['application/json'];
    const schema = content.schema;

    const ref = getSchemaRef(schema);

    if (!ref) {
        //
    }

    const paths = ref.split('/');
    const schemaName = paths[paths.length - 1];
    const schemaDefinition = openapi.components.schemas[schemaName];

    if (!schemaDefinition) {
        //
    }

    return schemaDefinition as OpenAPIV3.SchemaObject;
}
