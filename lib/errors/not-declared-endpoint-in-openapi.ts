const NOT_DECLARED_ENDPOINT_IN_OPENAPI_MSG = (endpoint: string): string => `The '${endpoint}' endpoint is not declared in openapi!`;

export class NotDeclaredEndpointInOpenapi extends Error {
    constructor(endpoint) {
        super(NOT_DECLARED_ENDPOINT_IN_OPENAPI_MSG(endpoint));
    }
}
