class IDB extends Dexie {
  constructor() {
      super("vo-hermes");
      this.version(1).stores({
          notes: "++id, title, content",
          config: "name, value",
          feed_source: "++id, name, url, lastUpdated, status",
          feed: "++id, feed_source_id, source_id, title, description, url, pubDate"
      });
  }
}
var StatusEnum;
(function (StatusEnum) {
  StatusEnum[StatusEnum["ERROR"] = 0] = "ERROR";
  StatusEnum[StatusEnum["OK"] = 1] = "OK";
  StatusEnum[StatusEnum["UNKNOWN"] = 2] = "UNKNOWN";
})(StatusEnum || (StatusEnum = {}));

