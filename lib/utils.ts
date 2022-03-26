import { OpenAPIV3 } from 'openapi-types';
import { Data } from './interfaces';

export const isObj = (o) => {
    return typeof o === 'object' && !Array.isArray(o) && o !== null;
}

export const wrapDataToArrayData = (data: Data | Data[]): Data[] => {
    return Array.isArray(data) ? data : [data];
}

export const wrapSchemaProperties = (properties): Array<{
    key: string,
    value: OpenAPIV3.SchemaObject
}> => {
    return Object.entries(properties).map(([key, value]) => ({ key, value }));
}
