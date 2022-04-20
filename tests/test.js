import {SqlitePathQLDatabaseController} from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import {BasisTests} from "pathql/tests/Tests/BasisTests.class.js";
import {RequestTests} from "pathql/tests/Tests/RequestTests.class.js";
import {ConnectionTests} from "pathql/tests/Tests/ConnectionTests.class.js";
import {SearchTests} from "pathql/tests/Tests/SearchTests.class.js";
import {SearchConnectionTests} from "pathql/tests/Tests/SearchConnectionTests.class.js";
import {ConnectionRequestTests} from "pathql/tests/Tests/ConnectionRequestTests.class.js";

let db = new SqlitePathQLDatabaseController({"name": "test.db"});

let basisTest = await new BasisTests(db);
let requestTest = await new RequestTests(db);
let connectionTest = await new ConnectionTests(db);
let searchTests = await new SearchTests(db);
let searchConnectionTests = await new SearchConnectionTests(db);
let connectionRequestTests = await new ConnectionRequestTests(db);
