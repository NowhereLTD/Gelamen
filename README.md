# Gelamen

## Features
- ***Rapid implementation:*** Simple web applications can be implemented in a few minutes including a functioning backend connection.
- ***Smooth networking:*** The backend functions can be offered directly to the frontend and can be used directly by the frontend without any further steps.
- ***Unlimited extensibility:*** Almost every position in the front and back end can be extended as desired. Thanks to CustomEvents and differentiated logging, Gelamen offers dynamic customizability.
- ***Database support:*** So far, Gelamen offers database support for PostgreSQL and SQLite, but new database drivers can be connected in seconds.
- ***High security:*** Advanced Gelamen natively supports encryption at the client-client level, providing a secure way to transfer and store sensitive customer data. (alpha support)
- ***Based on Vanilla JS:*** All the advantages of this high-quality framework can be read here: [Vanilla JS](http://vanilla-js.com/). 

## Usage
You can simple create a new Gelamen Entry, which allows you to automize database over an orm and client requests over the Gelamen JSON Requests.

IMPORTANT: create an import_map.json and use it via deno cli
```json
{
  "imports": {
    "gelamen/": "https://raw.githubusercontent.com/NowhereLTD/Gelamen/master/"
  }
}
```

## Backend

### Entry Example:

The entry runs our entire database handling. You can simple add own database and frontend routes into the entry.

```javascript
import {GelamenServerEntry} from "gelamen/src/Gelamen/Server/GelamenServerEntry.class.js"

export class Groups extends GelamenServerEntry {
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
import {SqliteGelamenDatabaseController} from "gelamen/tests/DatabaseController/SqliteGelamenDatabaseController.class.js";
import {GelamenServerRequestHandler} from "gelamen/src/Gelamen/Server/GelamenServerRequestHandler.class.js";
import {Groups} from "src/Groups.class.js";

export class YourServer extends GelamenServerRequestHandler {
  constructor(options) {
    super(options);
    const db = new SqliteGelamenDatabaseController({name: "Test.sqlite", debug: false});
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
import {PostgreSQLGelamenDatabaseController} from "gelamen/tests/DatabaseController/PostgreSQLGelamenDatabaseController.class.js";
const db = new PostgreSQLGelamenDatabaseController({database: "test", username: "administrator", password: "eiB3ahlaequo3lan3Phahfai8winohl9", debug: false});

// SQLite example
import {SqliteGelamenDatabaseController} from "gelamen/tests/DatabaseController/SqliteGelamenDatabaseController.class.js";
const db = new SqliteGelamenDatabaseController({name: "Test.sqlite", debug: false});
```


## Frontend

All server-side entities are automatically provided to the frontend and can be used:
1. RequestHandler.class.js
```javascript
// Create custom GelamenClientRequestHandler
import {GelamenClientRequestHandler} from "gelamen/src/Gelamen/Client/GelamenClientRequestHandler.class.js";
import {GroupsClientEntry} from "./GroupsClientEntry.class.js";

export class RequestHandler extends GelamenClientRequestHandler {
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
import {GroupsClientEntry} from "gelamen/src/Gelamen/Client/GelamenClientEntry.class.js";

export class GroupsClientEntry extends GelamenClientEntry {
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

To use the `Local` tests copy the entire Gelamen folder to your local webserver, execute the `Tests/Local/Server/server.sh` and open the url `http://localhost/gelamen/tests/Tests/Client/` in your webbrowser.
