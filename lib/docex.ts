import * as path from 'path';
import * as fs from 'fs';
import * as SwaggerParser from 'swagger-parser';
import * as Cache from './cache';
import {
    INVALID_MIDDLEWARE_ARGS_MSG,
    InvalidOpenapiFile,
    MissingRequiredOption,
    NotFoundOpenapiFile
} from './errors';
import { DocexOptions, MiddlewareArgs } from './interfaces';

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

const parseOpenapi = async (openapiPath: string) => {
    try {
        return await SwaggerParser.parse(openapiPath);
    } catch (e) {
        throw new InvalidOpenapiFile();
    }
}

const cacheOpenapi = async (openapiPath: string) => {
    try {
        const cache = Cache.getInstance();
        const parsedOpenapi = await parseOpenapi(openapiPath);

        cache.set('openapi', parsedOpenapi);
    } catch (e) {
        throw e;
    }

}

const constructDocument = (data, params) => {

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

    const cache = Cache.getInstance();

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
            if (!cache.has('openapi')) {
                await cacheOpenapi(openapiPath);
            }

            const params = {
                openapi: cache.get('openapi'),
                url: req.url,
                method: req.method.toLowerCase(),
                ext: req?.body?.ext ?? 'json',
                type: req?.body?.type ?? 'table'
            }

            return await constructDocument(data, params);
        } catch (e) {
            next(e);
        }
    }
}

export default docex;
