const INVALID_OPENAPI_FILE_MSG = `
    An invalid openapi file has been passed. Please check your file for validity at https://editor.swagger.io/
`;

export class InvalidOpenapiFile extends Error {
    constructor() {
        super(INVALID_OPENAPI_FILE_MSG);
        this.name = 'InvalidOpenapiFile';
    }
}
