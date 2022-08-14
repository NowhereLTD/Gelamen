import {TestServer} from "pathql/tests/Entrys/TestServer.class.js";
import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";

const db = new SqlitePathQLDatabaseController({"name": "test.db"});
const server = new TestServer({db: db});
await server.listen();

