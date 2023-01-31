import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";

Deno.test("store test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({"name": "test.db"});
	try {
		const user = await new User({
			"db": db,
			"doCheckPermissions": false
		});
		const _storeRequest = await user.store({});

		db.close();
	}catch(e) {
		console.error(e);
		db.close();
		throw e;
	}
});