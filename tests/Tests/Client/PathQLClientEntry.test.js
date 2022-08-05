/*import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { TestServer } from "pathql/tests/Entrys/TestServer.class.js";
import { PathQLClientRequestHandler } from "pathql/src/PathQL/Client/PathQLClientRequestHandler.class.js";
*/
Deno.test("pathql request client and server handler test", async (_t) => {
	/*const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	const server = new TestServer({db: db});
  console.log("start server...");
  server.listen();
  await new Promise((resolve) => setTimeout(resolve,  500));
  const client = new PathQLClientRequestHandler();
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