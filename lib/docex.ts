import * as path from 'path';
import * as fs from 'fs';
import {
    OpenAPIV3,
} from 'openapi-types';
import * as Excel from 'exceljs';
import * as qs from 'qs';
import { v4 as uuidv4 } from 'uuid';
import * as PdfPrinter from 'pdfmake';
import * as Cache from './cache';
import {
    INVALID_MIDDLEWARE_ARGS_MSG,
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
import {
    cacheOpenapi,
    getOpenapiSchema
} from './openapi';
import {
    getFonts,
    isObj,
    wrapDataToArrayData,
    wrapSchemaProperties
} from './utils';
import { CONFIG } from './config';

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

const flatNestedValue = (elementData, properties, type) => {
    let row = [];

    const addPaddingToFlat = () => {
        row.push(['', '']);
    }

    let arrayData = wrapDataToArrayData(elementData);
    let schemaProperties = wrapSchemaProperties(properties);

    for (let dIndex = 0; dIndex < arrayData.length; dIndex++) {
        let element = arrayData[dIndex];

        for (let pIndex = 0; pIndex < schemaProperties.length; pIndex++) {
            let schemaProperty = schemaProperties[pIndex];

            let propertyKey = schemaProperty.key;
            let propertyValue = schemaProperty.value;

            if (Array.isArray(element[propertyKey]) || isObj(element[propertyKey])) {
                let innerProperties = properties[propertyKey].properties;

                if (type === CONFIG.LIST_TYPE_NAME) {
                    addPaddingToFlat();
                    row.push([propertyValue.title, '']);
                    addPaddingToFlat();
                }

                let flatValue = flatNestedValue(element[propertyKey], innerProperties, type);
                row.push(...flatValue);

                continue;
            }

            row.push([propertyValue.title, element[propertyKey]]);
        }
    }

    return row;
}

const collectRows = (data: Data | Data[], schema: OpenAPIV3.SchemaObject, type: Type): any[] => {
    let rows = [];

    const addPaddingToRows = () => {
        rows.push(['', '']);
    }

    let arrayData = wrapDataToArrayData(data);
    let schemaProperties = wrapSchemaProperties(schema.properties);

    for (let dIndex = 0; dIndex < arrayData.length; dIndex++) {
        let element = arrayData[dIndex];

        for (let pIndex = 0; pIndex < schemaProperties.length; pIndex++) {
            let schemaProperty = schemaProperties[pIndex];

            let propertyKey = schemaProperty.key;
            let propertyValue = schemaProperty.value;

            let header = propertyValue.title;
            let value = element[propertyKey];

            if (propertyKey === 'number') {
                if (type === CONFIG.TABLE_TYPE_NAME) {
                    (rows[dIndex] ??= []).push(dIndex + 1);
                }

                if (type === CONFIG.LIST_TYPE_NAME) {
                    (rows[pIndex] ??= []).push(header, dIndex + 1);
                }

                continue;
            }

            if (Array.isArray(value) || isObj(value)) {
                const flatRow = flatNestedValue(value, propertyValue.properties, type);

                if (type === CONFIG.LIST_TYPE_NAME) {
                    addPaddingToRows();
                    rows.push([header, '']);
                    addPaddingToRows();
                    rows.push(...flatRow);
                    addPaddingToRows();
                }

                if (type === CONFIG.TABLE_TYPE_NAME) {
                    let str = flatRow.map(([key, value]) => `${key}: ${value}`).join('\n');
                    (rows[dIndex] ??= []).push(str);
                }

            } else {
                if (type === CONFIG.LIST_TYPE_NAME) {
                    (rows[pIndex] ??= []).push(header, value);
                }

                if (type === CONFIG.TABLE_TYPE_NAME) {
                    (rows[dIndex] ??= []).push(value);
                }
            }
        }
    }

    return rows;
}

const getTableColumnsXlsx = (properties): Array<Partial<Excel.Column>> => {
    return wrapSchemaProperties(properties).map(property => ({
        key: property.key,
        header: property.value.title
    }));
}

const getTableColumnsPdf = (properties) => {
    return wrapSchemaProperties(properties).map(property => ({
        text: property.value.title,
        style: 'tableHeader'
    }));
}

const getListColumnsXlsx = () => {
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

const getTableDocDefinitionPdf = (properties, rows) => {
    const columns = getTableColumnsPdf(properties)

    return {
        pageOrientation: 'landscape',
        content: [
            {
                table: {
                    headerRows: 1,
                    body: [columns, ...rows]
                },
                style: 'table'
            }
        ]
    }
}

const getListDocDefinitionPdf = (rows) => {
    return {
        pageOrientation: 'landscape',
        content: [
            {
                layout: 'noBorders',
                table: {
                    headerRows: 1,
                    body: rows
                },
                style: 'table'
            },
        ]
    }
}

const writeBufferPdf = async (docDefinition): Promise<Buffer> => {
    return new Promise((resolve) => {
        const fonts = getFonts(__dirname);

        const printer = new PdfPrinter(fonts);
        const doc = printer.createPdfKitDocument(docDefinition);

        let chunks = [];
        let result;

        doc.on('data', (chunk) => {
            chunks.push(chunk);
        });

        doc.on('end', () => {
            result = Buffer.concat(chunks);
            resolve(result);
        });

        doc.end();
    });
}

const constructPDF = async (rows, schema: OpenAPIV3.SchemaObject, type: Type): Promise<Buffer> => {
    let docDefinition;

    if (type === CONFIG.TABLE_TYPE_NAME) {
        docDefinition = getTableDocDefinitionPdf(schema.properties, rows);
    } else if (type === CONFIG.LIST_TYPE_NAME) {
        docDefinition = getListDocDefinitionPdf(rows)
    }

    return await writeBufferPdf(docDefinition);
}

const constructXLSX = async (rows, schema: OpenAPIV3.SchemaObject, type: Type): Promise<Buffer> => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet();

    if (type === CONFIG.TABLE_TYPE_NAME) {
        worksheet.columns = getTableColumnsXlsx(schema.properties);
    } else if (type === CONFIG.LIST_TYPE_NAME) {
        worksheet.columns = getListColumnsXlsx();
    }

    worksheet.addRows(rows);

    return await workbook.xlsx.writeBuffer() as Buffer;
}

const constructDocument = async (params: ConstructDocumentParams): Promise<Buffer> => {
    const schema = getOpenapiSchema(params.url, params.method);
    const rows = collectRows(params.data, schema, params.type);

    let buffer;

    if (params.ext === CONFIG.PDF_EXT_NAME) {
        buffer = await constructPDF(rows, schema, params.type);
    } else if (params.ext === CONFIG.XLSX_EXT_NAME) {
        buffer = await constructXLSX(rows, schema, params.type);
    }

    return buffer;
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
            if (!cache.has(CONFIG.OPENAPI_CACHE_KEY)) {
                await cacheOpenapi(openapiPath);
            }

            const query = qs.parse(req._parsedUrl.query);

            const params: ConstructDocumentParams = {
                data,
                openapi: cache.get(CONFIG.OPENAPI_CACHE_KEY),
                url: req._parsedUrl.pathname,
                method: req.method.toLowerCase(),
                ext: req?.body?.ext ?? query?.ext ?? 'json',
                type: req?.body?.type ?? query?.type ?? 'table',
            }

            if (params.ext === 'json') {
                return data;
            }

            const documentBuffer = await constructDocument(params);
            const fileName = uuidv4();

            if (options?.savePath) {
                const filePath = `${options.savePath}/${fileName}.${params.ext}`;

                fs.writeFileSync(filePath, documentBuffer);

                return {
                    fileName,
                    filePath
                }
            }

            if (options?.bufferAsResponse) {
                return {
                    fileName,
                    documentBuffer
                }
            }

        } catch (e) {
            next(e);
        }
    }
}

export default docex;
