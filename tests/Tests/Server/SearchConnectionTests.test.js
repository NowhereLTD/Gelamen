import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Groups } from "pathql/tests/Entrys/Groups.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("search connection test", async (_t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start search connection test");
		console.log("[OK] create group object");
		const group = await new Groups({
			"name": "Test Group",
			"db": db
		});
		await group.save();

		console.log("[OK] create user object");
		const user = await new User({
			"name": "Test",
			"db": db
		});
		await user.save();

		console.log("[OK] connect user and group object");
		assertEquals(await group.add({key: "users", token: user}), true);

		// TODO: test to get all groups connections
		// await group.cObj["users"].getConnections(user, group);

		const requestExample = await new User({"db": db});

		console.log("[OK] search by connection");
		const data = await requestExample.parseRequest({
			data: {
				search: {
					ORDER: "token",
					LIMIT: 10,
					START: 0,
					Groups: {
						type: "EQUAL",
						values: [group.token]
					},
					data: {
						id: "",
						token: "",
						name: ""
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
		await group.delete();
		await user.delete();
	} catch (e) {
		console.log(e);
		console.log("[Error] test failed cannot find object...");
	}
	db.close();
});