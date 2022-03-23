import {PathQLEntry} from "pathql/src/PathQL/PathQLEntry.class.js"
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class Groups extends PathQLEntry {
  static fields = {
    "id": {
      "type": "Int",
      "db": {
        "primary": true,
        "autoincrement": true
      }
    },
    "name": {
      "type": "String"
    }
  }

  constructor(options = {}, db) {
    super(options, db);
    this.connections = [User];
    return (async function () {
      await this.parseFromRaw();
      return this;
    }.bind(this)());
  }
}
