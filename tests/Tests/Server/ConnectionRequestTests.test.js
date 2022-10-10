import { SqlitePathQLDatabaseController } from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import { Groups } from "pathql/tests/Entrys/Groups.pathql.js";
import { User } from "pathql/tests/Entrys/User.pathql.js";
import {assertEquals} from "https://deno.land/std@0.159.0/testing/asserts.ts";

Deno.test("basis test", async (_t) => {
  const db = new SqlitePathQLDatabaseController({ "name": "test.db" });
  try {
    console.log("----------------------");
    console.log("[OK] start request connection test");
    console.log("[OK] create group object");
    const group = await new Groups({
      "name": "Test Group",
      "db": db
    });
    assertEquals(await group.save(), true);

    console.log("[OK] create user object");
    const user = await new User({
      "name": "Test",
      "db": db
    });
    assertEquals(await user.save(), true);

    console.log("[OK] send connect user and group request");
    const requestExample = await new Groups({"db": db});

    const data = await requestExample.parseRequest({
      data: {
        search: {
          token: {
            type: "EQUAL",
            values: [group.token]
          },
          data: {
            token: "",
            name: "",
            addObj: {
              name: "User",
              token: user.token
            },
            rmObj: {
              name: "User",
              token: user.token
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

    console.log(data)
    assertEquals(data.search.length, 1);

    // Clear data
    console.log("[OK] clear search test data");
    await group.delete();
    await user.delete();
  } catch (e) {
    console.log(e);
    console.log("[Error] test failed cannot find object...");
    db.close();
		throw e;
  }
	db.close();
});