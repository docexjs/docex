import * as NodeCache from 'node-cache';

const cache = new NodeCache();

export const getCacheInstance = () => {
    return cache;
}
