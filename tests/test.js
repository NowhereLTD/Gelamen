import {SqlitePathQLDatabaseController} from "pathql/tests/DatabaseController/SqlitePathQLDatabaseController.class.js";
import {BasisTests} from "pathql/tests/Tests/Server/BasisTests.class.js";
import {RequestTests} from "pathql/tests/Tests/Server/RequestTests.class.js";
import {ConnectionTests} from "pathql/tests/Tests/Server/ConnectionTests.class.js";
import {SearchTests} from "pathql/tests/Tests/Server/SearchTests.class.js";
import {SearchConnectionTests} from "pathql/tests/Tests/Server/SearchConnectionTests.class.js";
import {ConnectionRequestTests} from "pathql/tests/Tests/Server/ConnectionRequestTests.class.js";

const db = new SqlitePathQLDatabaseController({"name": "test.db"});

const basisTest = await new BasisTests(db);
const requestTest = await new RequestTests(db);
const connectionTest = await new ConnectionTests(db);
const searchTests = await new SearchTests(db);
const searchConnectionTests = await new SearchConnectionTests(db);
const connectionRequestTests = await new ConnectionRequestTests(db);
