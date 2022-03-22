import {Example} from "pathql/tests/Entrys/Example.pathql.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class RequestTests {
  constructor(db) {
    return (async function () {
      try {
        console.log("----------------------");
        console.log("[OK] start request test");
        console.log("[OK] create a new object");
        let user = await new User({
          "name": "Test"
        }, db);
        await user.init();
        await user.save();

        let example = await new Example({
          "name": "Test",
          "email": "test@example.com",
          "tagline": "My project",
          "contributors": [user.id]
        }, db);
        await example.init();
        await example.save();

        let requestExample = await new Example({}, db);

        /**
         * send request and check request data anwser
         */
        /*let requestData = {};
        for(let key in Example.fields) {
          requestData[key] = "";
        }
        requestData.id = example.id;
        let data = await requestExample.parseRequest({
          data: requestData
        });*/

        let data = await requestExample.parseRequest({
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
    }.bind(this)());
  }
}
