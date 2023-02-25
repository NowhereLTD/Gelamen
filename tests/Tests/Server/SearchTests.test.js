import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Example } from "pathql/tests/Entrys/Example.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("basis test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start search test");
		const user = await new User({
			"name": "Test",
			"db": db,
			"doCheckPermissions": false
		});
		await user.save();

		const example = await new Example({
			"name": "Test",
			"email": "test@example.com",
			"tagline": "My project",
			"db": db,
			"doCheckPermissions": false
		});
		await example.save();
		await example.add({key: "admin", token: user});

		const requestExample = await new Example({"db": db, "doCheckPermissions": false});

		console.log("[OK] search by parameters");
		const data = await requestExample.parseRequest({
			data: {
				search: {
					ORDER: "token",
					LIMIT: 10,
					START: 0,
					"admin": {
						type: "EQUAL",
						values: [user.token]
					},
					/*id: {
						type: "EQUAL",
						values: [10]
					},*/
					data: {
						id: "",
						name: "",
						contributors: {
							id: ""
						},
						admin: {
							id: ""
						}
					}
				}
			},
			settings: {
				connection: {
					permissions: ["*"]
				}
			}
		});
		assertEquals(data.search.length, 1);

		// Clear data
		console.log("[OK] clear search test data");
		await example.delete();
		await user.delete();
	} catch (e) {
		console.log(e);
		console.log("[Error] test failed cannot find object...");
		db.close();
		throw e;
	}
	db.close();
});