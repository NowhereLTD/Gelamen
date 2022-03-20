import {SqlitePathQLDatabaseController} from "/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import {BasisTests} from "/tests/Tests/BasisTests.class.js";
import {RequestTests} from "/tests/Tests/RequestTests.class.js";
import {ConnectionTests} from "/tests/Tests/ConnectionTests.class.js";
import {SearchTests} from "/tests/Tests/SearchTests.class.js";

let db = new SqlitePathQLDatabaseController({"name": "test.db"});

let basisTest = await new BasisTests(db);
let requestTest = await new RequestTests(db);
let connectionTest = await new ConnectionTests(db);
let searchTests = await new SearchTests(db);
