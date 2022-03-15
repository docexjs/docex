import * as path from 'path';
import * as fs from 'fs';
import * as SwaggerParser from 'swagger-parser';
import * as Cache from './cache';
import {
    InvalidMiddlewareArgs,
    MissingRequiredOption,
    NotFoundOpenapiFile
} from './errors';
import { DocexOptions, MiddlewareArgs } from './interfaces';

const unzipMiddlewareArgs = (args): MiddlewareArgs => {
    if (!Array.isArray(args)) {
        throw new InvalidMiddlewareArgs();
    }

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
        const {
            req,
            res,
            next
        }: MiddlewareArgs = unzipMiddlewareArgs(args);

        return await next();
    }
}

export default docex;
