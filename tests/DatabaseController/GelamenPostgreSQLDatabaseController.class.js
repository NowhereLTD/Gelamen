import {Client} from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {GelamenDatabaseController} from "gelamen/src/Gelamen/Server/GelamenDatabaseController.class.js";

/**
 * This is an example implementation for an GelamenDatabaseController based on an sqkite Database Implementation
 * Please Note: The "group" entry is not possible because of a naming conflict with the sqlite database.
 */
export class GelamenPostgreSQLDatabaseController extends GelamenDatabaseController {
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

		// Fix integer max size bug
		this.types["INT"]["database"] = "TEXT";

		this.waitForConnection = new Promise((res, err) => {
			try {
				async () => {
					await this.connection.connect();
					res();
				}
			}catch(_e) {
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
			let count = 0;
			statement = statement.replace(/\?/g, (_x) => {count++; return `$${count}`;});
			statement = statement.replace("TEXT PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY");

			if(this.debug) {
				console.log(statement);
				console.log(data);
			}

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
