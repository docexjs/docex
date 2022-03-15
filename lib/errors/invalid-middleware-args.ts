const INVALID_MIDDLEWARE_ARGS = 'An invalid middleware args has been passed.';

export class InvalidMiddlewareArgs extends Error {
    constructor() {
        super(INVALID_MIDDLEWARE_ARGS);
    }
}
