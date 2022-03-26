import * as path from 'path';
import * as fs from 'fs';
import {
    OpenAPIV3,
} from 'openapi-types';
import * as Excel from 'exceljs';
import * as qs from 'qs';
import { v4 as uuidv4 } from 'uuid';
import * as PdfPrinter from 'pdfmake';
import * as pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';
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
    let flatValue = [];

    const addPaddingToFlat = () => {
        flatValue.push(['', '']);
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

                if (type === CONFIG.LIST_TYPE_NAME) {
                    addPaddingToFlat();
                    flatValue.push([propertyValue.title, '']);
                    addPaddingToFlat();
                }

                flatNestedValue(element[propertyKey], innerProperties, type);
            }

            flatValue.push([propertyValue.title, element[propertyKey]]);
        }

        if (type === CONFIG.LIST_TYPE_NAME) {
            addPaddingToFlat();
        }
    }

    return flatValue;
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

            if (propertyKey === 'number' && type !== CONFIG.LIST_TYPE_NAME) {
                row.push(++dIndex);
                continue;
            }

            let header = propertyValue.title;
            let value = element[propertyKey];

            if (Array.isArray(value) || isObj(value)) {
                const flatValue = flatNestedValue(value, propertyValue.properties, type);

                if (type === CONFIG.LIST_TYPE_NAME) {
                    addPaddingToRows();
                    rows.push([header, '']);
                    addPaddingToRows();
                    rows.push(...flatValue);
                    addPaddingToRows();

                    continue;
                }

                let str = flatValue.map(([key, value]) => `${key}: ${value}`).join('\n')
                row.push(str);

                continue;
            }
            if (type === CONFIG.LIST_TYPE_NAME) {
                rows.push([header, value]);
                continue;
            }
            row.push(value);
        }

        if (!row.length && type === CONFIG.LIST_TYPE_NAME) {
            continue;
        }

        if (type !== CONFIG.LIST_TYPE_NAME) {
            rows.push(row);
        }
    }

    return rows;
}

const getTableColumnsXlsx = (properties): Array<Partial<Excel.Column>> => {
    return Object.entries(properties).map(([key, value]: [string, OpenAPIV3.SchemaObject]) => ({
        key,
        header: value.title
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

const getTableDocDefinitionPdf = (columns, rows) => {
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

const writeBufferPdf = async (docDefinition) => {
    const fonts = {
        Roboto: {
            normal:      path.resolve(__dirname, '../lib/fonts/Roboto-Regular.ttf'),
            bold:        path.resolve(__dirname, '../lib/fonts/Roboto-Medium.ttf'),
            italics:     path.resolve(__dirname, '../lib/fonts/Roboto-Italic.ttf'),
            bolditalics: path.resolve(__dirname, '../lib/fonts/Roboto-MediumItalic.ttf')
        }
    };

    return new Promise((resolve) => {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
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

const constructPDF = async (data: Data | Data[], schema: OpenAPIV3.SchemaObject, type: Type) => {
    const schemaProperties = wrapSchemaProperties(schema.properties);
    const columns = schemaProperties.map(property => ({
        text: property.value.title,
        style: 'tableHeader'
    }));

    let docDefinition;

    const rows = collectRows(data, schema, type);

    if (type === CONFIG.TABLE_TYPE_NAME) {
        docDefinition = getTableDocDefinitionPdf(columns, rows);
    } else if (type === CONFIG.LIST_TYPE_NAME) {
        docDefinition = getListDocDefinitionPdf(rows)
    }

    return await writeBufferPdf(docDefinition);
}

const constructXLSX = async (data: Data | Data[], schema: OpenAPIV3.SchemaObject, type: Type) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet();

    if (type === CONFIG.TABLE_TYPE_NAME) {
        worksheet.columns = getTableColumnsXlsx(schema.properties);
    } else if (type === CONFIG.LIST_TYPE_NAME) {
        worksheet.columns = getListColumnsXlsx();
    }

    const rows = collectRows(data, schema, type);
    worksheet.addRows(rows);

    return await workbook.xlsx.writeBuffer();
}

const constructDocument = async (params: ConstructDocumentParams) => {
    const schema = getOpenapiSchema(params.url, params.method);

    let buffer;

    if (params.ext === 'pdf') {
        buffer = await constructPDF(params.data, schema, params.type);
    } else if (params.ext === 'xlsx') {
        buffer = await constructXLSX(params.data, schema, params.type);
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

            const document = await constructDocument(params);
            const fileName = uuidv4();

            if (options?.savePath) {
                const filePath = `${options.savePath}/${fileName}.${params.ext}`;

                fs.writeFileSync(filePath, document);
            }

            if (options?.bufferAsResponse) {
                return {
                    fileName,
                    document
                }
            }

        } catch (e) {
            next(e);
        }
    }
}

export default docex;
