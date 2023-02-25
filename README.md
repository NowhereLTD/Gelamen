# PathQL

## Features
- ***Rapid implementation:*** Simple web applications can be implemented in a few minutes including a functioning backend connection.
- ***Smooth networking:*** The backend functions can be offered directly to the frontend and can be used directly by the frontend without any further steps.
- ***Unlimited extensibility:*** Almost every position in the front and back end can be extended as desired. Thanks to CustomEvents and differentiated logging, PathQL offers dynamic customizability.
- ***Database support:*** So far, PathQL offers database support for PostgreSQL and SQLite, but new database drivers can be connected in seconds.
- ***High security:*** Advanced PathQL natively supports encryption at the client-client level, providing a secure way to transfer and store sensitive customer data. (alpha support)

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

## Backend

### Entry Example:

The entry runs our entire database handling. You can simple add own database and frontend routes into the entry.

```javascript
import {PathQLServerEntry} from "pathql/src/PathQL/Server/PathQLServerEntry.class.js"

export class Groups extends PathQLServerEntry {
  static fields = {
    "name": {
      "type": "String"
    }
  }

  static methods = {};

  constructor(options = {}) {
    options.logging = "INFO";
    super(options);
    return (async function () {
      await this.parseFromRaw(options);
      return this;
    }.bind(this)());
  }
}
```

### Server Example

The server handles the client requests and gives you the possibility to provide your backend entrys to your frontend.

```javascript
import {SqlitePathQLDatabaseController} from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import {PathQLServerRequestHandler} from "pathql/src/PathQL/Server/PathQLServerRequestHandler.class.js";
import {Groups} from "src/Groups.class.js";

export class YourServer extends PathQLServerRequestHandler {
  constructor(options) {
    super(options);
    const db = new SqlitePathQLDatabaseController({name: "Test.sqlite", debug: false});
    super({"db": db, name: "Test API"});
    this.objects = {
      "Groups": Groups
    };
  }
}
```

Show into tests/ folder for Entry and Request examples.

### Database support

Pathql Supports SQLite and PostgreSQL Databases:
```javascript
// PostgreSQL example
import {PostgreSQLPathQLDatabaseController} from "pathql/tests/DatabaseController/PostgreSQLPathQLDatabaseController.class.js";
const db = new PostgreSQLPathQLDatabaseController({database: "test", username: "administrator", password: "eiB3ahlaequo3lan3Phahfai8winohl9", debug: false});

// SQLite example
import {SqlitePathQLDatabaseController} from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
const db = new SqlitePathQLDatabaseController({name: "Test.sqlite", debug: false});
```


## Frontend

All server-side entities are automatically provided to the frontend and can be used:
1. RequestHandler.class.js
```javascript
// Create custom PathQLClientRequestHandler
import {PathQLClientRequestHandler} from "pathql/src/PathQL/Client/PathQLClientRequestHandler.class.js";
import {GroupsClientEntry} from "./GroupsClientEntry.class.js";

export class RequestHandler extends PathQLClientRequestHandler {
  constructor(options = {}) {
    // The backend entities can be extended with personalized frontend functions if needed.
    options.baseClassList = {
      "Groups": GroupsClientEntry
    };
    super(options);
  }
}
```

2. GroupsClientEntry.class.js
```javascript
import {GroupsClientEntry} from "pathql/src/PathQL/Client/PathQLClientEntry.class.js";

export class GroupsClientEntry extends PathQLClientEntry {
  constructor(options = {}) {
    super(options);
  }

  async myCustomFrontendFunction() {
    // do custom stuff
  }
}
```

3. main.js
```javascript
// Finally integrating the classes and using the frontend functions
import {RequestHandler} from "RequestHandler.class.js";

const handler = new RequestHandler({});
// Wait for the handler, which will automatically load all entities from the server
handler.addEventListener("loadAll", async ()=> {
  const group = await new handler.objects.Groups();
  // run some default methods
  await group.search({
    "name": {
      type: "EQUAL",
      values: ["Testgroup"]
    }
  });
  // evaluating the server response
  console.log(group.data.search);
  // or error messages
  console.log(group.error);

  // run some custom methods
  await group.myCustomFrontendFunction();
}

```

## Tests
There are two types of tests, the `Local` and the `CLI` tests.
The `CLI` tests are in the `Tests/Client` and `Tests/Server` directory and the `Local` tests are in the `Tests/Local` directory.

To use the `CLI` tests just run the `test.sh` in our `tests/` directory.

To use the `Local` tests copy the entire PathQL folder to your local webserver, execute the `Tests/Local/Server/server.sh` and open the url `http://localhost/pathql/tests/Tests/Client/` in your webbrowser.

## Miscellaneous
For most people without mathematical knowledge it is not too easy to describe a graph.  That's why I created PathQL, the one path everyone understands.