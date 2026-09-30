import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  mongoClient?: Promise<MongoClient>;
  indexesReady?: Promise<void>;
};

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  globalForMongo.mongoClient ??= new MongoClient(uri).connect();
  return globalForMongo.mongoClient;
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(process.env.MONGODB_DB || "claude_usage");
  globalForMongo.indexesReady ??= ensureIndexes(db);
  await globalForMongo.indexesReady;
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("events").createIndex({ ts: -1 }),
    db.collection("events").createIndex({ name: 1, ts: -1 }),
    db.collection("events").createIndex({ deviceKey: 1, ts: -1 }),
  ]);
}

export type EventDoc = {
  ts: Date;
  receivedAt: Date;
  name: string;
  sessionId?: string;
  promptId?: string;
  model?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  durationMs?: number;
  terminalType?: string;
  appVersion?: string;
  userEmail?: string;
  deviceKey: string;
  host?: string;
  osUser?: string;
  osType?: string;
  label?: string;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  attrs: Record<string, unknown>;
};

export type DeviceDoc = {
  _id: string;
  host?: string;
  osUser?: string;
  osType?: string;
  label?: string;
  firstSeen: Date;
  lastSeen: Date;
  lastIp?: string;
  city?: string;
  region?: string;
  country?: string;
  ips?: string[];
};
