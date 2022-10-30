import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Example } from "pathql/tests/Entrys/Example.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("store test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({"name": "test.db"});
	try {
		const user = await new User({
			"db": db
		});
		const storeRequest = await user.store({});

		db.close();
	}catch(e) {
		console.error(e);
		db.close();
		throw e;
	}
});