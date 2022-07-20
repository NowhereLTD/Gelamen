import {PathQLServerEntry} from "pathql/src/PathQL/Server/PathQLServerEntry.class.js"
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class Groups extends PathQLServerEntry {
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
    },
    "users": {
      "type": "Object",
      "object": "User",
      "array": true
    }
  }

  constructor(options = {}, db) {
    super(options, db);
    this.objects = {
      "User": User
    };
    return (async function () {
      await this.parseFromRaw();
      return this;
    }.bind(this)());
  }
}
