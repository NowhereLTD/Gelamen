import {PathQLEntry} from "/src/PathQL/PathQLEntry.class.js"
import {User} from "/tests/Entrys/User.pathql.js";

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

  static connections = [User];

  constructor(options = {}, db) {
    super(options, db);
    return (async function () {
      await this.parseFromRaw();
      return this;
    }.bind(this)());
  }
}
