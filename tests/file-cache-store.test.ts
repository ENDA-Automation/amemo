import { jest } from "@jest/globals";
import { createCacheStoreTests } from "./cach-store-test-factory";
import { FileCacheStore } from "../src/file-cache-store";

createCacheStoreTests({
  name: "File Cache Store",
  createStore: () => {
    return new FileCacheStore();
  },
  beforeEach: () => {},
  afterEach: () => {},
  beforeAll: () => {
    jest.unmock("fs");
  },
  afterAll: () => {
    const fcs = new FileCacheStore();
    fcs.clear();
  },
});
