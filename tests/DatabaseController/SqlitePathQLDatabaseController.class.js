import {DB} from "https://deno.land/x/sqlite/mod.ts";
import {PathQLDatabaseController} from "pathql/src/PathQL/Server/PathQLDatabaseController.class.js";

export class SqlitePathQLDatabaseController extends PathQLDatabaseController {
  constructor(options) {
    super(options);
    this.connection = new DB(this.options.name);
  }

  async runPrepared(statement, data) {
    try {
      let result = this.connection.query(statement, data);
      let cursor = this.connection._wasm.last_insert_rowid();
      return {
        "result": result,
        "cursor": cursor
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async close() {
    return this.connection.close();
  }
}
