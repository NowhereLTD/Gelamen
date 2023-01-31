import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Example } from "pathql/tests/Entrys/Example.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("basis test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({"name": "test.db"});
	try {
		const user = await new User({
			"db": db,
			"doCheckPermissions": false
		});
		await user.save();
	
		const example = await new Example({
			"db": db,
			"doCheckPermissions": false
		});
		assertEquals(await example.save(), true);
	
		example.name = "Test1";
		const updateResult = await example.save();
		assertEquals(updateResult, true);
		assertEquals(example.name, "Test1");
	
		const loadExample = await new Example({
			"db": db,
			"token": example.token,
			"doCheckPermissions": false
		});
		const loadResult = await loadExample.load();
		assertEquals(loadResult, true);
		assertEquals(example.name, "Test1");

		assertEquals(await example.delete(), true);

		assertEquals(await user.delete(), true);
		db.close();
	}catch(e) {
		console.error(e);
		db.close();
		throw e;
	}
});