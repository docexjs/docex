const MISSING_REQUIRED_OPTION_MSG = (option: string): string => `The '${option}' option is required.`;

export class MissingRequiredOption extends Error {
    constructor(option: string) {
        super(MISSING_REQUIRED_OPTION_MSG(option));
    }
}
