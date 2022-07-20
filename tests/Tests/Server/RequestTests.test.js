import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Example } from "pathql/tests/Entrys/Example.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";

Deno.test("basis test", async (t) => {
	const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
	try {
		console.log("----------------------");
		console.log("[OK] start request test");
		console.log("[OK] create a new object");
		const user = await new User({
			"name": "Test"
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
		await example.save();

		const requestExample = await new Example({}, db);

		/**
		 * send request and check request data anwser
		 */
		/*const requestData = {};
		for(const key in Example.fields) {
			requestData[key] = "";
		}
		requestData.id = example.id;
		const data = await requestExample.parseRequest({
			data: requestData
		});*/

		const data = await requestExample.parseRequest({
			data: {
				id: example.id,
				contributors: {
					name: ""
				}
			},
			settings: {
				connection: {
					permissions: ["*"]
				}
			}
		});

		console.log(data);
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