import {TestServer} from "gelamen/tests/Entrys/TestServer.class.js";
import { SqliteGelamenDatabaseController } from "gelamen/tests/DatabaseController/SqliteGelamenDatabaseController.class.js";

const db = new SqliteGelamenDatabaseController({"name": "test.db"});
const server = new TestServer({db: db});
await server.listen();

