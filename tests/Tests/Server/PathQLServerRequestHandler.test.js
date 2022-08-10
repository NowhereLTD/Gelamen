import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { TestServer } from "pathql/tests/Entrys/TestServer.class.js";

Deno.test("pathql request handler test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	const server = new TestServer({db: db});
  console.log("start server...");
  await new Promise((resolve) => setTimeout(resolve,  500));
  console.log("stop server...");
  server.stop();

  db.close();
});