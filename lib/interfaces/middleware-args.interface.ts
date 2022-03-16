import { IncomingMessage, ServerResponse } from 'http';
import { NextFunction } from 'express';

export interface MiddlewareArgs {
    req: IncomingMessage;
    res: ServerResponse;
    next: NextFunction;
}
