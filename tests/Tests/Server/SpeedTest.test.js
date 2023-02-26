import { GelamenSqliteDatabaseController } from "gelamen/tests/DatabaseController/GelamenSqliteDatabaseController.class.js";
import { User } from "gelamen/tests/Entrys/User.gelamen.js";

Deno.test("speed test", async (_t) => {
	const db = new GelamenSqliteDatabaseController({ "name": "test.db" });
	console.log("----------------------");
		console.log("[OK] Start speed test - Create 100 entitys!");
    const users = [];
    console.time("Create #1");
    for(let i=0; i<100; i++) {
      const user = await new User({
        "name": "Test",
        "db": db,
        "doCheckPermissions": false
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