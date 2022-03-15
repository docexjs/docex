const NOT_FOUND_OPENAPI_FILE_MSG = 'Unable to load openapi file. (Please make sure that it\'s already existed.)';

export class NotFoundOpenapiFile extends Error {
    constructor() {
        super(NOT_FOUND_OPENAPI_FILE_MSG);
    }
}
