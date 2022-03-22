import {Groups} from "pathql/tests/Entrys/Groups.pathql.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class ConnectionTests {
  constructor(db) {
    return (async function () {
      try {
        console.log("----------------------");
        console.log("[OK] start connection test");
        console.log("[OK] create group object");
        let group = await new Groups({
          "name": "Test"
        }, db);
        await group.init();
        await group.save();

        console.log("[OK] create user object");
        let user = await new User({
          "name": "Test"
        }, db);
        await user.init();
        await user.save();

        console.log("[OK] connect user and group object");
        await group.cObj.User.connect(user, group);

        // test to get all groups connections
        await group.cObj.User.getConnections(user, group)

        // Clear data
        console.log("[OK] clear connection test data");
        await group.delete();
        await user.delete();
      } catch (e) {
        console.log(e);
        console.log("[Error] test failed cannot connect objects...");
      }
    }.bind(this)());
  }
}
