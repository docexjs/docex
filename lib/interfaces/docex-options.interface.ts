export interface DocexOptions {
    /** Path to openapi file relative to root */
    openapiPath: string | null;

    savePath: string | null;
    bufferAsResponse: boolean | null
}
