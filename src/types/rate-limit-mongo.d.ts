declare module "rate-limit-mongo" {
  import { Store } from "express-rate-limit";

  interface MongoStoreOptions {
    uri: string;
    collectionName?: string;
    expireTimeMs?: number;
    errorHandler?: (error: Error) => void;
  }

  export default class MongoStore implements Store {
    constructor(options: MongoStoreOptions);
  }
}
