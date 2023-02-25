import {DB} from "https://deno.land/x/sqlite/mod.ts";
import {PathQLDatabaseController} from "pathql/src/PathQL/Server/PathQLDatabaseController.class.js";

/**
 * This is an example implementation for an PathQLDatabaseController based on an sqkite Database Implementation
 * Please Note: The "group" entry is not possible because of a naming conflict with the sqlite database.
 */
export class SqlitePathQLDatabaseController extends PathQLDatabaseController {
	constructor(options) {
		super(options);
		this.connection = new DB(this.options.name);
		this.debug = this.options.debug ? this.options.debug : false;
	}

	/**
	 * run an prepared statement
	 * @param {*} statement 
	 * @param {*} data 
	 * @returns 
	 */
	runPrepared(statement, data) {
		try {
			if(this.debug) {
				console.log(statement);
				console.log(data);
			}
			const result = this.connection.query(statement, data);
			const cursor = this.connection.lastInsertRowId;
			return {
				"result": result,
				"cursor": cursor
			};
		} catch (e) {
			console.error(e);
			return null;
		}
	}

	/**
	 * close the database connection
	 * @returns 
	 */
	close() {
		return this.connection.close();
	}
}
