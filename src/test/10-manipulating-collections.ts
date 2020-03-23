import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

describe("Manipulating collections", function() {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  let collection: DocumentCollection;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
    await db.createDatabase(name);
    db.useDatabase(name);
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    } finally {
      db.close();
    }
  });
  beforeEach(async () => {
    collection = await db.createCollection(`collection-${Date.now()}`);
  });
  afterEach(async () => {
    try {
      await collection.get();
    } catch (e) {
      return;
    }
    await collection.drop();
  });
  describe("collection.create", () => {
    it("creates a new document collection", async () => {
      const collection = await db.createCollection(
        `document-collection-${Date.now()}`
      );
      const info = await db.collection(collection.name).get();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("isSystem", false);
      expect(info).to.have.property("status", 3); // loaded
      expect(info).to.have.property("type", 2); // document collection
    });
    it("creates a new edge collection", async () => {
      const collection = await db.createEdgeCollection(
        `edge-collection-${Date.now()}`
      );
      const info = await db.collection(collection.name).get();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("isSystem", false);
      expect(info).to.have.property("status", 3); // loaded
      expect(info).to.have.property("type", 3); // edge collection
    });
  });
  describe("collection.load", () => {
    it("should load a collection", async () => {
      const info = await collection.load();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("status", 3); // loaded
    });
  });
  describe("collection.unload", () => {
    it("should unload a collection", async () => {
      const info = await collection.unload();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("status");
      expect(info.status === 2 || info.status === 4).to.be.true; // unloaded
    });
  });
  describe("collection.setProperties", () => {
    it("should change properties", async () => {
      const info = await collection.properties({ waitForSync: true });
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("waitForSync", true);
    });
  });
  describe("collection.rename", () => {
    it("should rename a collection", async () => {
      const res = await db.route("/_admin/server/role").get();
      if (res.body.role !== "SINGLE") return;
      const name = `rename-collection-${Date.now()}`;
      const info = await collection.rename(name);
      expect(info).to.have.property("name", name);
    });
  });
  describe("collection.truncate", () => {
    it("should truncate a non-empty collection", async () => {
      await collection.save({});
      await collection.truncate();
      const info = await collection.count();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("count", 0);
    });
    it("should allow truncating a empty collection", async () => {
      await collection.truncate();
      const info = await collection.count();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("count", 0);
    });
  });
  describe("collection.drop", () => {
    it("should drop a collection", async () => {
      await collection.drop();
      try {
        await collection.get();
      } catch (err) {
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
  });
});
