import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Example } from "pathql/tests/Entrys/Example.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";


Deno.test("basis test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	const user = await new User({
		"name": "Test1"
	}, db);
	await user.init();
	await user.save();

	const example = await new Example({
		"name": "Test",
		"email": "test@example.com",
		"tagline": "My project",
		"contributors": [user.id],
		"admin": user.id
	}, db);
	await example.init();

	const saveResult = await example.save();
	if (saveResult) {
		console.log("[OK] save method works...");
	}

	example.name = "Test1";
	const updateResult = await example.save();
	if (updateResult && example.name == "Test1") {
		console.log("[OK] update method works...");
	} else {
		console.error("[ERROR] error in update method");
	}

	const loadExample = await new Example({
		"id": example.id
	}, db);
	const loadResult = await loadExample.load();

	if (loadResult && loadExample.name == "Test1") {
		console.log("[OK] load method works...");
	} else {
		console.error("[ERROR] error in load method");
	}

	const deleteResult = await example.delete();
	if (deleteResult) {
		console.log("[OK] delete method works...");
	} else {
		console.error("[ERROR] error in delete method");
	}
	db.close();
});