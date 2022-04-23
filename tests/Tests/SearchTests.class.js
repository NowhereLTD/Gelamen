import {Example} from "pathql/tests/Entrys/Example.pathql.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class SearchTests {
  constructor(db) {
    return (async function () {
      try {
        console.log("----------------------");
        console.log("[OK] start search test");
        let user = await new User({
          "name": "Test"
        }, db);
        await user.init();
        await user.save();

        let example = await new Example({
          "name": "Test",
          "email": "test@example.com",
          "tagline": "My project",
          "contributors": [user.id],
          "admin": user.id
        }, db);
        await example.init();
        await example.save();

        let requestExample = await new Example({}, db);

        console.log("[OK] search by parameters");
        let data = await requestExample.parseRequest({
          data: {
            search: {
              ORDER: "id",
              LIMIT: 10,
              START: 0,
              "admin": {
                type: "BETWEEN",
                values: [0, user.id]
              },
              /*id: {
                type: "EQUAL",
                values: [10]
              },*/
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

        if(data.search) {
          console.log("[OK] find objects by search parameter");
        }

        if(data.count) {
          console.log("[OK] found " + data.count + " objects.");
        }

        // Clear data
        console.log("[OK] clear search test data");
        await example.delete();
        await user.delete();
      } catch (e) {
        console.log(e);
        console.log("[Error] test failed cannot find object...");
      }
    }.bind(this)());
  }
}
