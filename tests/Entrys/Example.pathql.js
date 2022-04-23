import {PathQLEntry} from "pathql/src/PathQL/PathQLEntry.class.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class Example extends PathQLEntry {
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
    "tagline": {
      "type": "String"
    },
    "email": {
      "type": "Email"
    },
    "contributors": {
      "type": "Object",
      "object": "User",
      "array": true
    },
    "admin": {
      "type": "Object",
      "object": "User"
    }
  }

  static objects = {
    "User": User
  };

  constructor(options = {}, db) {
    super(options, db);
    return (async function () {
      await this.parseToRaw();
      return this;
    }.bind(this)());
  }
}
