const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');

const docex = require('../../dist/docex.js').default;

const app = new Koa();
const router = new Router();

router.get('/', (ctx, next) => {
    const obj = {
        number: 1,
        name: 'Docex',
        desc: 'Middleware',
        nestedObj: {
            test: 1,
            prop: 2,
            double: [{
                a: 1,
                b: 2,
                c: [{
                    d: '3',
                    e: '4'
                }]
            }]
        },
        nestedArr: [{
            ppp: 'qwe',
            www: 'rty'
        }]
    };
    ctx.body = obj;

    return obj;
});

app.use(docex({ openapiPath: './openapi.yaml', savePath: './docs' }));
app.use(router.routes());
app.use(router.allowedMethods());

module.exports = http.createServer(app.callback()).listen(3000);
