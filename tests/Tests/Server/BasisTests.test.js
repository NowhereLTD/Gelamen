import { GelamenSqliteDatabaseController } from "gelamen/tests/DatabaseController/GelamenSqliteDatabaseController.class.js";
import { Example } from "gelamen/tests/Entrys/Example.gelamen.js";
import { User } from "gelamen/tests/Entrys/User.gelamen.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("basis test", async (_t) => {
	const db = new GelamenSqliteDatabaseController({"name": "test.db"});
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