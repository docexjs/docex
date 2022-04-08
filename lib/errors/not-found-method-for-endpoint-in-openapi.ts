const NOT_FOUND_METHOD_FOR_ENDPOINT_IN_OPENAPI_MSG = 'Not found method for endpoint';

export class NotFoundMethodForEndpointInOpenapi extends Error {
    constructor() {
        super(NOT_FOUND_METHOD_FOR_ENDPOINT_IN_OPENAPI_MSG);
    }
}
