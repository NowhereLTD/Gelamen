import {PathQLEntry} from "/src/PathQL/PathQLEntry.class.js"

export class User extends PathQLEntry {
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
    return (async function () {
      await this.parseFromRaw();
      return this;
    }.bind(this)());
  }
}
