import Types from "gelamen/etc/data/types.json" assert {type: "json"};
import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenDatabaseController {
	static AUTOINCREMENT = "AUTOINCREMENT";
	static PRIMARY = "PRIMARY KEY";
	static UNIQUE = "UNIQUE";

	constructor(options) {
		this.options = options;
		this.connection = null;
		this.types = Types;
	}

	async runPrepared(_statement, _data) {}

	/**
	 * Translate table type to structure type
	 * @param {String} _table 
	 */
	async getTableStructure(_table) {}

	/**
	 * This method get a specific type and transform it to a database type
	 * @param {String} _type 
	 */
	getType(type = "") {
		type = type.toUpperCase();
		if(this.types[type] != null) {
			return this.types[type];
		} else {
			throw new GelamenError({msg: `Cannot found the specific type <${type}> in the database handler!`});
		}
	}

	async close() {}
}
