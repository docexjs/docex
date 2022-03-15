import { IncomingMessage, ServerResponse } from 'http';
import { NextFunction } from 'express';
import { InvalidMiddlewareArgs } from './errors';

interface IMiddlewareArgs {
    req: IncomingMessage;
    res: ServerResponse;
    next: NextFunction;
}

const unzipMiddlewareArgs = (args): IMiddlewareArgs => {
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

const docex = () => {
    return async (...args) => {
        const {
            req,
            res,
            next
        }: IMiddlewareArgs = unzipMiddlewareArgs(args);

        return await next();
    }
}

export default docex;
