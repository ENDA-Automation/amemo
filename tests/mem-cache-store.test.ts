import { MemCacheStore } from "../src/mem-cache-store";
import { createCacheStoreTests } from "./cach-store-test-factory";

createCacheStoreTests({
  name: "Memory Cache Store",
  createStore: () => {
    return new MemCacheStore();
  },
  cleanup: () => {
    // No specific cleanup needed for memory store
  },
});
