import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";

Deno.test("speed test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	console.log("----------------------");
		console.log("[OK] Start speed test - Create 100 entitys!");
    const users = [];
    console.time("Create #1");
    for(let i=0; i<100; i++) {
      const user = await new User({
        "name": "Test",
        "db": db
      });
      await user.save();
      users.push(user);
    }
    console.timeEnd("Create #1");

    console.log("[OK] Delete 100 entitys!");
    console.time("Delete #1");
    for(const user of users) {
      await user.delete();
    }
    console.timeEnd("Delete #1");
	db.close();
});