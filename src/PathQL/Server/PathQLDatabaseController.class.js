
export class PathQLDatabaseController {
  static AUTOINCREMENT = "AUTOINCREMENT";
  static PRIMARY = "PRIMARY KEY";
  static UNIQUE = "UNIQUE";

  constructor(options) {
    this.options = options;
    this.connection = null;
  }

  async runPrepared(statement, data) {}

  async close() {}
}
