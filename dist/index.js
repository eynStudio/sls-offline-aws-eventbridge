"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koa = require("koa");
const bodyParser = require("koa-bodyparser");
const path_1 = require("path");
class SlsOfflineAwsEventbridgePlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.config = { port: 5656 };
        this.location = process.cwd();
        this.subscribers = [];
        this.hooks = {
            "before:offline:start": () => this.start(),
            "after:offline:start:end": () => this.server.close(),
        };
        this.config = Object.assign(Object.assign({}, this.config), this.serverless.service.custom["sls-offline-aws-eventbridge"]);
        this.app = this.createApp();
    }
    async start() {
        const offlineConfig = this.serverless.service.custom["serverless-offline"] || {};
        const locationRelativeToCwd = offlineConfig.location;
        this.location = process.cwd();
        if (locationRelativeToCwd) {
            this.location = process.cwd() + "/" + locationRelativeToCwd;
        }
        else if (this.serverless.config.servicePath) {
            this.location = this.serverless.config.servicePath;
        }
        this.buildSubscribers();
        this.log("start on port: " + this.config.port);
        this.server = this.app.listen(this.config.port);
    }
    buildSubscribers() {
        let subscribers = [];
        Object.keys(this.serverless.service.functions).map((fnName) => {
            const fn = this.serverless.service.functions[fnName];
            if (fn.events) {
                fn.events
                    .filter((event) => event.eventBridge != null)
                    .map((event) => {
                    subscribers.push({
                        event: event.eventBridge,
                        functionName: fnName,
                        function: fn,
                    });
                });
            }
        });
        this.subscribers = subscribers;
    }
    createApp() {
        const app = new koa();
        app.use(bodyParser({ extendTypes: { json: ["application/x-amz-json-1.1"] } }));
        app.use((ctx) => {
            if (ctx.request.body.Entries) {
                Promise.all(ctx.request.body.Entries.map(async (entry) => {
                    this.subscribers
                        .filter((subscriber) => this.verifyIsSubscribed(subscriber, entry))
                        .map(async (subscriber) => {
                        const handler = this.createHandler(subscriber.functionName, subscriber.function);
                        const event = this.convertEntry(entry);
                        await handler()(event, {}, (err, success) => {
                            if (err) {
                                console.log(`sls-offline-aws-eventbridge error ::`, err);
                            }
                            else {
                                console.log(`sls-offline-aws-eventbridge ::`, success);
                            }
                        });
                    });
                }));
            }
            ctx.body = {};
        });
        return app;
    }
    verifyIsSubscribed(subscriber, entry) {
        const { eventBus = ["default"], pattern } = subscriber.event;
        const { EventBusName = "default", Source, DetailType, Detail } = entry;
        const subscribedChecks = [eventBus.includes(EventBusName)];
        if (pattern) {
            if (pattern.source) {
                subscribedChecks.push(pattern.source.includes(Source));
            }
            if (DetailType && pattern["detail-type"]) {
                subscribedChecks.push(pattern["detail-type"].includes(DetailType));
            }
            if (Detail && pattern["detail"]) {
                const detail = JSON.parse(Detail);
                Object.keys(pattern["detail"]).forEach((key) => {
                    subscribedChecks.push(pattern["detail"][key].includes(detail[key]));
                });
            }
        }
        const subscribed = subscribedChecks.every((x) => x);
        this.log(`${subscriber.functionName} ${subscribed ? "is" : "is not"} subscribed`);
        return subscribed;
    }
    createHandler(fnName, fn) {
        return this.createJavascriptHandler(fn);
    }
    createJavascriptHandler(fn) {
        return () => {
            const handlerFnNameIndex = fn.handler.lastIndexOf(".");
            const handlerPath = fn.handler.substring(0, handlerFnNameIndex);
            const handlerFnName = fn.handler.substring(handlerFnNameIndex + 1);
            const fullHandlerPath = path_1.resolve(this.location, handlerPath);
            const handler = require(fullHandlerPath)[handlerFnName];
            return handler;
        };
    }
    convertEntry(entry) {
        try {
            const event = {
                version: "0",
                id: `xxxxxxxx-xxxx-xxxx-xxxx-${new Date().getTime()}`,
                source: entry.Source,
                account: "",
                time: new Date().toISOString(),
                region: "localhost",
                resources: [],
                detail: JSON.parse(entry.Detail),
            };
            if (entry.DetailType) {
                event["detail-type"] = entry.DetailType;
            }
            return event;
        }
        catch (error) {
            this.log(`error converting entry: ${error.message}.`);
            return entry;
        }
    }
    log(msg) {
        this.serverless.cli.log(`sls-offline-aws-eventbridge ${msg}`);
    }
}
module.exports = SlsOfflineAwsEventbridgePlugin;
//# sourceMappingURL=index.js.map