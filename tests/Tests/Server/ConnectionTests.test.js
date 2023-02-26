import { GelamenSqliteDatabaseController } from "gelamen/tests/DatabaseController/GelamenSqliteDatabaseController.class.js";
import { Groups } from "gelamen/tests/Entrys/Groups.gelamen.js";
import { User } from "gelamen/tests/Entrys/User.gelamen.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("basis test", async (_t) => {
	const db = new GelamenSqliteDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start connection test");
		console.log("[OK] create group object");
		const group = await new Groups({
			"name": "Testgroup",
			"db": db,
			"doCheckPermissions": false
		});
		await group.save();

		console.log("[OK] create user object");
		const user = await new User({
			"name": "Test1",
			"db": db,
			"doCheckPermissions": false
		});
		await user.save();

		console.log("[OK] connect user and group object");
		assertEquals(await group.add({key: "users", token: user}), true);

		// TODO: test to get all groups connections
		//await group.cObj["users"].getConnections(user, group);

		assertEquals(await group.remove({key: "users", token: user}), true);

		// Clear data
		console.log("[OK] clear connection test data");
		await group.delete();
		await user.delete();
	} catch (e) {
		console.log(e);
		console.log("[Error] test failed cannot connect objects...");
		db.close();
		throw e;
	}
	db.close();
});