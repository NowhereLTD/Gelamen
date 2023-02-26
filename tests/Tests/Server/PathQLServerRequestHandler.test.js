import { GelamenSqliteDatabaseController } from "gelamen/tests/DatabaseController/GelamenSqliteDatabaseController.class.js";
import { TestServer } from "gelamen/tests/Entrys/TestServer.class.js";

Deno.test("gelamen request handler test", async (_t) => {
	const db = new GelamenSqliteDatabaseController({ "name": "test.db" });
	const server = new TestServer({db: db});
  console.log("start server...");
  await new Promise((resolve) => setTimeout(resolve,  500));
  console.log("stop server...");
  server.stop();

  db.close();
});