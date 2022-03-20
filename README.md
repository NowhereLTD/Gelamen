# PathQL

## Usage
You can simple create a new PathQL Entry, which allows you to automize database over an orm and client requests over the PathQL JSON Requests.

Entry Example:
```javascript
import {PathQLEntry} from "/src/PathQL/PathQLEntry.class.js"

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
    
  // can be used for m to n connection
  // static connections = [User];

  constructor(options = {}, db) {
    super(options, db);
    return (async function () {
      await this.parseFromRaw();
      return this;
    }.bind(this)());
  }
}
```


Show into tests/ folder for Entry and Request examples.
