import Dexie, {Table } from "dexie"

export class IDB extends Dexie {
  notes!: Table<Note, number>
  config!: Table<Config, number>
  feed_source!: Table<FeedSource, number>
  feed!: Table<Feed>
  constructor() {
    super("vo-hermes")
    this.version(1).stores({
      notes: "++id, title, content",
      config: "++id, name, value",
      feed_source: "++id, url, lastUpdated, status",
      feed: "++id, feed_source_id, source_id, title, content,url, lastUpdated"
    })
  }
}

export type Note = {
  id?: number
  title: string
  content: string
}

export type Config = {
  id?: number
  name: string
  value: string
}
export type UrlString = string
export type DateString = string
export type FeedSource = {
  id?: number
  url: UrlString
  lastUpdated: number
  status: StatusEnum
}
export enum StatusEnum{
  ERROR = 0,
  OK = 1
}
export type Feed = {
  id?: number
  feed_source_id: NonNullable<FeedSource>["id"]
  source_id: number
  title: string
  content: string
  url: UrlString
  lastUpdated: DateString
}