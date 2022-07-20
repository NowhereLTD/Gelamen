import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Groups } from "pathql/tests/Entrys/Groups.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";

Deno.test("basis test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start connection test");
		console.log("[OK] create group object");
		const group = await new Groups({
			"name": "Testgroup"
		}, db);
		await group.init();
		await group.save();

		console.log("[OK] create user object");
		const user = await new User({
			"name": "Test1"
		}, db);
		await user.init();
		await user.save();

		console.log("[OK] connect user and group object");
		await group.cObj["users"].connect(user, group);

		// test to get all groups connections
		await group.cObj["users"].getConnections(user, group);

		// Clear data
		console.log("[OK] clear connection test data");
		await group.delete();
		await user.delete();
	} catch (e) {
		console.log(e);
		console.log("[Error] test failed cannot connect objects...");
	}
	db.close();
});