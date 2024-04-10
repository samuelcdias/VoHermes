importScripts('../public/dexie.min.js');
importScripts('../public/nanoid.min.js');
importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/4.3.6/fxparser.min.js'
);
importScripts('idb.js');

const VERSION = 3;
const STATIC_CACHE = `vo-hermes-v${VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/public/dexie.min.js',
    '/public/nanoid.min.js',
    '/src/script.js',
    '/src/register.js',
    '/public/apple-touch-icon.png',
    '/public/favicon-mobile.png',
];
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/4.3.6/fxparser.min.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(() => {
        caches
            .open(STATIC_CACHE)
            .then((cache) => {
                cache.addAll(STATIC_ASSETS);
            })
            .then((cache) => {
                cache.addAll(CDN_ASSETS);
            });
    });
});
self.addEventListener('activate', (ev) => {
    // delete old versions of caches.
    ev.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key != STATIC_CACHE)
                    .map((key) => caches.delete(key))
            );
        })
    );
});
// returning static assets from cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
self.addEventListener('message', ({ data, source: { id } }) => {
    handleMessage(data, id);
});
/**
 * Handle a message with the given data and ID.
 *
 * @param {object} data - description of the data parameter
 * @param {string} id - description of the id parameter
 * @return {type} description of the return value
 */
function handleMessage(data, id) {
    console.log('Web page received', data, id);
}
/**
 * Asynchronously sends a message to either a specific client or to all clients.
 *
 * @param {object} msg - The message to send
 * @param {string} clientId - The id of the client to send the message to, if specified
 * @return {Promise<Array>} A promise that resolves with an array of promises for each client's response
 */
const sendMessage = async (msg, clientId) => {
    let allClients = [];
    if (clientId) {
        let client = await clients.get(clientId);
        allClients.push(client);
    } else {
        allClients = await clients.matchAll({ includeUncontrolled: true });
    }
    return Promise.all(
        allClients.map((client) => {
            return client.postMessage(msg);
        })
    );
};
function getNanoId() {
    const alphabet =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-{}[]()^~⠁⠂⠃⠄⠅⠅⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠑⠑⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠹⠹⠻⠼⠽⠾⠿';
    const nanoid = customAlphabet(alphabet, 10);
    return nanoid;
}

async function checkConfig() {
    if ('Dexie' in self) {
        self.db = new IDB();
        self.XMLParser = new XMLParser();
        const user_id = await db.config.where('name').equals('user_id').first();
        const defaultDBConfig = JSON.parse((await (await fetch("/public/default_config.json",{
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            }
        })).text()));

        if (!user_id) {
            const nanoid = getNanoId()();
            await db.config.add({ name: 'user_id', value: nanoid });
            await db.config.add({name: 'version', value: 0});
            // await NewsFlow.insertFeed({
            //     name: 'TabNews',
            //     url: 'https://www.tabnews.com.br/api/v1/contents/rss',
            // });
            await NewsFlow.insertFeed({
                name: 'DEV Community',
                url: 'https://dev.to/feed',
            });
        }
        const configVersion = await db.config.where('name').equals('version').first();
        if(defaultDBConfig.version > configVersion.value){
            let configs = []
            for (const [key, value] of Object.entries(defaultDBConfig)) {
                configs.push({name: key, value: value});
            }
            await db.config.bulkPut(configs);
        }

        /**
         * @typedef {Object} Config
         * @property {string} name - Name of the configuration.
         * @property {any} value - Value of the configuration.
         */

        /**
         * @typedef {Object} FeedSource
         * @property {string} name - Name of the feed.
         * @property {string} url - Url of the feed.
         * @property {string} lastUpdated - Last updated time of the feed.
         * @property {number} status - Status of the feed last time checked.
         */

        /** feed_source_id, source_id, title, description, url, pubDate
         * @typedef {Object} Feed
         * @property {string} feed_source_id - Id of the feed in source.
         * @property {string} source_id - Id of the feed in db.
         * @property {string} title - Title of the feed.
         * @property {string} description - Description of the feed.
         * @property {string} content - Content of the feed.
         * @property {string} pubDate - Publish date of the feed.
         */
    } else {
        console.error('Dexie is not available');
    }
}
checkConfig();

class NewsFlow {
    constructor() {}

    static isDbReady() {
        if ('db' in self) {
            return true;
        }
        return false;
    }

    /**
     * Insert a new feed into the database.
     *
     * @param {Object} feed - The feed object to be inserted.
     * @param {string} feed.name - The name of the feed.
     * @param {string} feed.url - The URL of the feed.
     * @returns {Promise<void>}
     */
    static async insertFeed(feed) {
        self.db.feed_source.add({
            name: feed.name,
            url: feed.url,
            lastUpdated: 0,
            status: StatusEnum.UNKNOWN,
        });
    }
    /**
     * Asynchronously retrieves feeds from the database source.
     *
     * @return {Promise<FeedSource[]>} The retrieved feeds from the database source.
     *
     * @throws {Error} If the database is not ready.
     */
    static async getFeeds() {
        const feed_source = await self.db.feed_source.toArray();
        return feed_source;
    }
    static async getFeedToUpdate(){
        const to_update = (await NewsFlow.getFeeds()).filter(
            (f) => Date.now() - f.lastUpdated > 1000 * 60 * 10
        );
        return to_update
    }
    static async requestFeedInformation(to_update) {
        if (to_update.length == 0) {
            return;
        }
        console.info(
            'Requesting feed information for',
            to_update.map((f) => f.name).join(', ')
        );
        Promise.allSettled(
            to_update.map((f) => {
                return fetch(f.url, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'default',
                    headers: {
                        Accept: 'application/xhtml+xml, application/xml; text/xml;',
                    },
                });
            })
        ).then((responses) => {
            responses.forEach(async (response) => {
                if (response.status === 'fulfilled' && response.value.ok) {
                    //TODO: changes to use readable stream
                    const xmlfeed = await response.value.text();
                    const jsonFeed = self.XMLParser.parse(xmlfeed);
                    console.log('feed', jsonFeed);
                    const parser = new FeedParser(
                        new URL(response.value.url).origin
                    );
                    await parser.parse(jsonFeed);
                } else {
                    console.warn('rejected', response);
                    const sourceId = NewsFlow.getFeedByLink(
                        new URL(response.value.url).origin
                    );
                    await self.db.feed_source
                        .where({ id: sourceId })
                        .modify({
                            lastUpdated: Date.now(),
                            status: StatusEnum.ERROR,
                        });
                }
            });
        });
    }

    static async getFeedByLink(link) {
        const founded = await self.db.feed_source
            .where('url')
            .startsWith(link)
            .first();
        return founded;
    }
    /**
     * Retrieves the JSON schema for the feed from the specified feed url.
     *
     * @param {URL} url - The URL
     * @return {Promise} The JSON schema for the feed
     */
    static async getFeedJsonSchema(url) {
        const schema = await self.db.config
            .where('name')
            .startsWith('feed.' + url.host.replace('www.', ''))
            .toArray();
        if (schema.length == 0) {
            return null;
        }
        return {
            lastUpdated: NewsFlow.getProperty(schema, 'lastUpdated'),
            items: NewsFlow.getProperty(schema, 'items'),
            feed_source_id: NewsFlow.getProperty(schema, 'feed_source_id'),
            title: NewsFlow.getProperty(schema, 'title'),
            description: NewsFlow.getProperty(schema, 'description'),
            content: NewsFlow.getProperty(schema, 'content'),
            pubDate: NewsFlow.getProperty(schema, 'pubDate'),
            url: NewsFlow.getProperty(schema, 'url'),
        };
    }
    static getProperty(schema, path) {
        return schema
            .filter((s) => s.name.endsWith(path))[0]
            .value;
    }
}
class FeedHandler {
    constructor() {}

    static async getFeeds() {
        const total =
            self.db.config.where('name').equals('feed.total').first() || 10;
        return self.db.feed_source
            .orderBy('lastUpdated')
            .reverse()
            .limit(total)
            .toArray();
    }
    static async IdExists(id) {
        const feedFounded = await self.db.feed
            .where('feed_source_id')
            .equals(id)
            .first();
        return feedFounded != undefined;
    }
}
class FeedParser {
    _link;
    _schema;
    constructor(link) {
        this._link = link;
    }

    async parse(jsonFeed) {
        const selfClass = this;
        const schema = await NewsFlow.getFeedJsonSchema(
            new URL(selfClass._link)
        );
        selfClass._schema = schema;

        if (!selfClass.isSchemaValid(selfClass._schema)) {
            console.log('Schema for ' + this._link + ' is not valid');
            return;
        }
        const lastUpdate = new Date(
            selfClass.getProperty(jsonFeed, 'lastUpdated')
        );
        console.log('lastUpdate', lastUpdate, selfClass.getProperty(jsonFeed, 'lastUpdated'));
        const linkUrl = new URL(selfClass._link);
        const sourceId = await NewsFlow.getFeedByLink(linkUrl.origin);
        if(sourceId == null) {
            return;
        }

        let feedAdded = 0;
        for (const item of jsonFeed.rss.channel.item) {
            const isAlreadyIncluded = await FeedHandler.IdExists(
                selfClass.getProperty(item, 'feed_source_id')
            );
            if (isAlreadyIncluded) {
                continue;
            }
            const date = selfClass.getProperty(item, 'pubDate')
                ? new Date(selfClass.getProperty(item, 'pubDate')).getTime()
                : lastUpdate.getTime();
            const feed = {
                feed_source_id: selfClass.getProperty(item, 'feed_source_id'),
                source_id: sourceId.id,
                title: selfClass.getProperty(item, 'title').trim(),
                description: selfClass.getProperty(item, 'description'),
                content: selfClass.getProperty(item, 'content'),
                url: selfClass.getProperty(item, 'url'),
                pubDate: date,
            };
            feedAdded++
            await self.db.feed.add(feed);
        }
        console.log("Added " + feedAdded + " feeds to " + sourceId.name);
        await self.db.feed_source
            .where({ id: sourceId.id })
            .modify({ lastUpdated: lastUpdate.getTime(), status: StatusEnum.OK });
    }
    isSchemaValid(schema) {
        return (
            schema &&
            'lastUpdated' in schema &&
            'items' in schema &&
            'feed_source_id' in schema &&
            'title' in schema &&
            'description' in schema &&
            'content' in schema &&
            'pubDate' in schema &&
            typeof schema.lastUpdated === 'string' &&
            typeof schema.items === 'string' &&
            typeof schema.feed_source_id === 'string' &&
            typeof schema.title === 'string' &&
            typeof schema.description === 'string' &&
            typeof schema.content === 'string'
        );
    }

    getProperty(item, path) {
        const innerPath = this._schema[path].split('.');

        let value = item;
        try {
            for (let i = 0; i < innerPath.length; i++) {
                value = value[innerPath[i]];
            }
        } catch (e) {
            console.error(
                'Error getting property ' + path + ' from ' + item,
                e
            );
            return undefined;
        }

        return value;
    }
}
console.log('ready');
NewsFlow.getFeedToUpdate().then((feeds) => {
    NewsFlow.requestFeedInformation(feeds);
})

