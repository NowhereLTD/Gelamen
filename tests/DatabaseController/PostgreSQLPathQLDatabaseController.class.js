import {Client} from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {PathQLDatabaseController} from "pathql/src/PathQL/Server/PathQLDatabaseController.class.js";

/**
 * This is an example implementation for an PathQLDatabaseController based on an sqkite Database Implementation
 * Please Note: The "group" entry is not possible because of a naming conflict with the sqlite database.
 */
export class PostgreSQLPathQLDatabaseController extends PathQLDatabaseController {
	static AUTOINCREMENT = "";

	constructor(options) {
		super(options);
		this.debug = this.options.debug ? this.options.debug : false;
		this.connection = new Client({
			user: this.options.username ? this.options.username : "",
			password: this.options.password ? this.options.password : "",
			database: this.options.database ? this.options.database : "pql",
			hostname: this.options.hostname ? this.options.hostname : "localhost",
			port: this.options.port ? this.options.port : 5432,
		});

		this.waitForConnection = new Promise(async (res, err) => {
			try {
				await this.connection.connect();
				res();
			}catch(e) {
				err();
			}
		});
	}

	/**
	 * run a prepared statement
	 * @param {*} statement 
	 * @param {*} data 
	 * @returns 
	 */
	async runPrepared(statement, data) {
		try {
			if(this.debug) {
				console.log(statement);
				console.log(data);
			}

			let count = 0;
			statement = statement.replace(/\?/g, (_x) => {count++; return `$${count}`;});

			const result = await this.connection.queryArray(
				statement,
				data
			);		
			return {
				"result": result.rows,
			};
		} catch (e) {
			console.error(e);
			return null;
		}
	}

	/**
	 * close the connection
	 * @returns 
	 */
	async close() {
		return await this.connection.close();
	}
}
