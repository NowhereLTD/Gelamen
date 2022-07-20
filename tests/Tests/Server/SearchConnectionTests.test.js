import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Groups } from "pathql/tests/Entrys/Groups.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";

Deno.test("basis test", async (t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start search connection test");
		console.log("[OK] create group object");
		const group = await new Groups({
			"name": "Test Group"
		}, db);
		await group.init();
		await group.save();

		console.log("[OK] create user object");
		const user = await new User({
			"name": "Test"
		}, db);
		await user.init();
		await user.save();

		console.log("[OK] connect user and group object");
		await group.cObj["users"].connect(user, group);

		// test to get all groups connections
		await group.cObj["users"].getConnections(user, group);

		const requestExample = await new User({}, db);

		console.log("[OK] search by connection");
		const data = await requestExample.parseRequest({
			data: {
				search: {
					ORDER: "id",
					LIMIT: 10,
					START: 0,
					Groups: {
						type: "EQUAL",
						values: [group.id]
					},
					data: {
						id: "",
						name: ""
					}
				},
				count: {
				}
			},
			settings: {
				connection: {
					permissions: ["*"]
				}
			}
		});
		console.log(data);

		if (data.search) {
			console.log("[OK] find objects by search parameter");
		}

		if (data.count) {
			console.log("[OK] found " + data.count + " objects.");
		}

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