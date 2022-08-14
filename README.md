# PathQL

## Usage
You can simple create a new PathQL Entry, which allows you to automize database over an orm and client requests over the PathQL JSON Requests.

IMPORTANT: create an import_map.json and use it via deno cli
```json
{
  "imports": {
    "pathql/": "https://raw.githubusercontent.com/NowhereLTD/PathQL/master/"
  }
}
```

### Entry Example:

The entry runs our entire database handling. You can simple add own database and frontend routes into the entry.

```javascript
import {PathQLServerEntry} from "pathql/src/PathQL/Server/PathQLServerEntry.class.js"

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

### Server Example

The server handles the client requests and gives you the possibility to provide your backend entrys to your frontend.

```javascript
import {PathQLServerRequestHandler} from "pathql/src/PathQL/Server/PathQLServerRequestHandler.class.js";
import {Groups} from "src/Groups.class.js";

export class YourServer extends PathQLServerRequestHandler {

  static objects = {
    "Groups": Groups
    // add all other objects
  }

  constructor(options) {
    super(options);
  }
}
```


Show into tests/ folder for Entry and Request examples.

## Tests
There are two types of tests, the `Local` and the `CLI` tests.
The `CLI` tests are in the `Tests/Client` and `Tests/Server` directory and the `Local` tests are in the `Tests/Local` directory.

To use the `CLI` tests just run the `test.sh` in our `tests/` directory.

To use the `Local` tests copy the entire PathQL folder to your local webserver, execute the `Tests/Local/Server/server.sh` and open the url `http://localhost/pathql/tests/Tests/Client/` in your webbrowser.

