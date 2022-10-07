import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Example } from "pathql/tests/Entrys/Example.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("request test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start request test");
		console.log("[OK] create a new object");
		const user = await new User({
			"name": "Test",
			"db": db
		});
		await user.save();

		const example = await new Example({
			"name": "Test",
			"email": "test@example.com",
			"tagline": "My project",
			"db": db
		});
		await example.save();
		await example.add("contributors", user);
		await example.add("admin", user);

		const requestExample = await new Example({"db": db});
		const data = await requestExample.parseRequest({
			data: {
				token: example.token,
				contributors: {
					name: "",
					id: ""
				},
				admin: {
					name: "",
					id: ""
				}
			},
			settings: {
				connection: {
					permissions: ["*"]
				}
			}
		});
		assertEquals(data.contributors[0].name, "Test");
		assertEquals(data.admin[0].name, "Test");
		assertEquals(data.admin[0].id, data.contributors[0].id);

		console.log("[OK] find request object");

		// Clear data
		console.log("[OK] clear request test data");
		await example.delete();
		await user.delete();
	} catch (e) {
		console.log(e);
		console.log("[Error] test failed cannot find object...");
	}
	db.close();
});