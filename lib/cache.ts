import * as NodeCache from 'node-cache';

const cache = new NodeCache();

export const getInstance = () => {
    return cache;
}
