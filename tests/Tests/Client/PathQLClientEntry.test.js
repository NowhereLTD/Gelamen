/*import { SqliteGelamenDatabaseController } from "gelamen/tests/DatabaseController/SqliteGelamenDatabaseController.class.js";
import { TestServer } from "gelamen/tests/Entrys/TestServer.class.js";
import { GelamenClientRequestHandler } from "gelamen/src/Gelamen/Client/GelamenClientRequestHandler.class.js";
*/
Deno.test("gelamen request client and server handler test", async (_t) => {
	/*const db = new SqliteGelamenDatabaseController({ "name": "test.db" });
	const server = new TestServer({db: db});
  console.log("start server...");
  server.listen();
  await new Promise((resolve) => setTimeout(resolve,  500));
  const client = new GelamenClientRequestHandler();
  await new Promise((resolve) => setTimeout(resolve,  1000));
  console.log("send request");
  const data = client.send({
    getObject: "Example"
  });
  console.log(data);
  await new Promise((resolve) => setTimeout(resolve,  500));
  console.log("stop server...");
  server.stop();

  db.close();*/
});