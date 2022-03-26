import * as path from 'path';
import * as fs from 'fs';
import * as SwaggerParser from 'swagger-parser';
import {
    OpenAPI,
    OpenAPIV3,
} from 'openapi-types';
import * as Excel from 'exceljs';
import * as Cache from './cache';
import {
    INVALID_MIDDLEWARE_ARGS_MSG,
    InvalidOpenapiFile,
    MissingRequiredOption,
    NotFoundOpenapiFile
} from './errors';
import {
    ConstructDocumentParams,
    DocexOptions,
    MiddlewareArgs,
    Type,
    Data
} from './interfaces';

const OPENAPI_CACHE_KEY = 'openapi';
const LIST_TYPE_NAME = 'list';
const TABLE_TYPE_NAME = 'table';

const cache = Cache.getInstance();

const unzipMiddlewareArgs = (args): MiddlewareArgs => {
    if (args.length === 2) {
        return {
            req: args[0].req,
            res: args[0].res,
            next: args[1]
        }
    }

    return {
        req: args[0],
        res: args[1],
        next: args[2]
    }
}

const parseOpenapi = async (openapiPath: string): Promise<OpenAPI.Document> => {
    try {
        return await SwaggerParser.parse(openapiPath);
    } catch (e) {
        throw new InvalidOpenapiFile();
    }
}

const cacheOpenapi = async (openapiPath: string) => {
    try {
        const parsedOpenapi = await parseOpenapi(openapiPath);
        cache.set(OPENAPI_CACHE_KEY, parsedOpenapi);
    } catch (e) {
        throw e;
    }
}

const getOpenapiSchema = (url, method = 'get'): OpenAPIV3.SchemaObject => {
    const openapi: OpenAPIV3.Document = cache.get(OPENAPI_CACHE_KEY);

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

const flatNestedProperty = (elementData, properties, type) => {
    let flat = [];

    const addPaddingToFlat = () => {
        flat.push(['', '']);
    }

    let arrayData = wrapDataToArrayData(elementData);
    let schemaProperties = wrapSchemaProperties(properties);

    for (let dIndex = 0; dIndex < arrayData.length; dIndex++) {
        let element = arrayData[dIndex];

        for (let pIndex = 0; pIndex < schemaProperties.length; pIndex++) {
            let schemaProperty = schemaProperties[pIndex];

            let propertyKey = schemaProperty.key;
            let propertyValue = schemaProperty.value;

            if (Array.isArray(element[propertyKey])) {
                let innerProperties = properties[propertyKey].properties;

                if (type === LIST_TYPE_NAME) {
                    addPaddingToFlat();
                    flat.push([propertyValue.title, '']);
                    addPaddingToFlat();
                }

                flatNestedProperty(element[propertyKey], innerProperties, type);

            }

            flat.push([propertyValue.title, element[propertyKey]]);
        }

        if (type === LIST_TYPE_NAME) {
            addPaddingToFlat();
        }
    }

    return flat;
}

const wrapDataToArrayData = (data: Data | Data[]): Data[] => {
    return Array.isArray(data) ? data : [data];
}

const wrapSchemaProperties = (properties): Array<{
    key: string,
    value: OpenAPIV3.SchemaObject
}> => {
    return Object.entries(properties).map(([key, value]) => ({ key, value }));
}

const isObj = (o) => {
    return typeof o === 'object' && !Array.isArray(o) && o !== null;
}

const collectRows = (data: Data | Data[], schema: OpenAPIV3.SchemaObject, type: Type): any[] => {
    let rows = [];

    const addPaddingToRows = () => {
        rows.push(['', '']);
    }

    let arrayData = wrapDataToArrayData(data);
    let schemaProperties = wrapSchemaProperties(schema.properties)

    for (let dIndex = 0; dIndex < arrayData.length; dIndex++) {
        let element = arrayData[dIndex];
        let row = [];

        for (let pIndex = 0; pIndex < schemaProperties.length; pIndex++) {
            let schemaProperty = schemaProperties[pIndex];

            let propertyKey = schemaProperty.key;
            let propertyValue = schemaProperty.value;

            if (propertyKey === 'number' && type !== LIST_TYPE_NAME) {
                row.push(++dIndex);
                continue;
            }

            let header = propertyValue.title;
            let value = element[propertyKey];

            if (Array.isArray(value) || isObj(value)) {
                const flat = flatNestedProperty(value, propertyValue.properties, type);

                if (type === LIST_TYPE_NAME) {
                    addPaddingToRows();
                    rows.push([header, '']);
                    addPaddingToRows();
                    rows.push(...flat);
                    addPaddingToRows();

                    continue;
                }

                let str = flat.map(([key, value]) => `${key}: ${value}`).join('\n')
                row.push(str);

                continue;
            }
            if (type === LIST_TYPE_NAME) {
                rows.push([header, value]);
                continue;
            }
            row.push(value);
        }

        if (!row.length && type === LIST_TYPE_NAME) {
            continue;
        }

        if (type !== LIST_TYPE_NAME) {
            rows.push(row);
        }
    }

    return rows;
}

const getTableColumns = (properties): Array<Partial<Excel.Column>> => {
    return Object.entries(properties).map(([key, value]: [string, OpenAPIV3.SchemaObject]) => ({
        key,
        header: value.title
    }));
}

const getListColumns = () => {
    return [
        {
            key: 'title',
            header: ''
        },
        {
            key: 'value',
            header: ''
        }
    ];
}

const constructPDF = async (data: Data | Data[], schema: OpenAPIV3.SchemaObject, type: Type) => {

}

const constructXLSX = async (data: Data | Data[], schema: OpenAPIV3.SchemaObject, type: Type) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet();

    if (type === TABLE_TYPE_NAME) {
        worksheet.columns = getTableColumns(schema.properties);
    } else if (type === LIST_TYPE_NAME) {
        worksheet.columns = getListColumns();
    }

    const rows = collectRows(data, schema, type);
    worksheet.addRows(rows);

    return await workbook.xlsx.writeBuffer();
}

const constructDocument = async (params: ConstructDocumentParams) => {
    const schema = getOpenapiSchema(params.url, params.method);

    let buffer;

    buffer = await constructXLSX(params.data, schema, params.type);

    fs.createWriteStream('./docs/test.xlsx').write(buffer);

    // if (params.ext === 'pdf') {
    //     buffer = await constructPDF(params.data, schema, params.type);
    // } else if (params.ext === 'xlsx') {
    //     buffer = await constructXLSX(params.data, schema, params.type);
    // }
}

const docex = (options: DocexOptions) => {
    if (!options?.openapiPath) {
        throw new MissingRequiredOption('openapiPath');
    }

    const rootPath = process.cwd();
    const openapiPath = path.join(rootPath, options.openapiPath);

    const isExistsOpenapiFile = fs.existsSync(openapiPath);

    if (!isExistsOpenapiFile) {
        throw new NotFoundOpenapiFile();
    }

    return async (...args) => {
        if (!Array.isArray(args)) {
            console.error(INVALID_MIDDLEWARE_ARGS_MSG);
            process.exit(1);
        }

        const {
            req,
            res,
            next
        }: MiddlewareArgs = unzipMiddlewareArgs(args);

        const data = await next();

        try {
            if (!cache.has(OPENAPI_CACHE_KEY)) {
                await cacheOpenapi(openapiPath);
            }

            const params: ConstructDocumentParams = {
                data,
                openapi: cache.get(OPENAPI_CACHE_KEY),
                url: req.url,
                method: req.method.toLowerCase(),
                ext: req?.body?.ext ?? 'xlsx',
                type: req?.body?.type ?? 'table'
            }

            return await constructDocument(params);
        } catch (e) {
            next(e);
        }
    }
}

export default docex;
