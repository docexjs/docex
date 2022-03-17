import {
    Request,
    Response,
    NextFunction
} from 'express';

export interface MiddlewareArgs {
    req: Request;
    res: Response;
    next: NextFunction;
}
