import * as Koa from 'koa';

const docex = () => {
    return async (ctx: Koa.Context, next: Koa.Next) => {
        return await next();
    }
}

export default docex;
