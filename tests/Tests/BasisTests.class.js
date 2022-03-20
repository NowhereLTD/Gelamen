import {Example} from "/tests/Entrys/Example.pathql.js";

export class BasisTests {
  constructor(db) {
    return (async function () {
      console.log("----------------------");
      console.log("[OK] start test");
      let example = await new Example({
        "name": "Test",
        "email": "test@example.com",
        "tagline": "My project",
        "contributors": [1]
      }, db);
      await example.init();

      let saveResult = await example.save();
      if(saveResult) {
        console.log("[OK] save method works...");
      }

      example.name = "Test1";
      let updateResult = await example.save();
      if(updateResult && example.name == "Test1") {
        console.log("[OK] update method works...");
      }else {
        console.error("[ERROR] error in update method");
      }

      let loadExample = await new Example({
        "id": example.id
      }, db);
      let loadResult = await loadExample.load();

      if(loadResult && loadExample.name == "Test1") {
        console.log("[OK] load method works...");
      }else {
        console.error("[ERROR] error in load method");
      }

      let deleteResult = await example.delete();
      if(deleteResult) {
        console.log("[OK] delete method works...");
      }else {
        console.error("[ERROR] error in delete method");
      }
    }.bind(this)());
  }
}
