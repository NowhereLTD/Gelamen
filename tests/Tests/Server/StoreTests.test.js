import { GelamenSqliteDatabaseController } from "gelamen/tests/DatabaseController/GelamenSqliteDatabaseController.class.js";
import { User } from "gelamen/tests/Entrys/User.gelamen.js";

Deno.test("store test", async (_t) => {
	const db = new GelamenSqliteDatabaseController({"name": "test.db"});
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