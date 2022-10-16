/**
 * A PathQLServerEntry represent a table or an entry
 * 
 * It can contains "standard" fields like Strings, Booleans, Integer ...
 * or "Object" fields, which represent a array or a single PathQLServerEntry
 * based on foreign tables.
 * 
 * The goals of the project are robustness, speed, Avoid redundant data.
 * 
 * Futuremore handles the PathQLServerEntry requests, permissions and history
 *
 */

import { PathQLDatabaseError } from "pathql/src/PathQL/Error/PathQLDatabaseError.class.js";
import { PathQLNotExistsError } from "pathql/src/PathQL/Error/PathQLNotExistsError.class.js";
import { PathQLNoPermissionError } from "pathql/src/PathQL/Error/PathQLNoPermissionError.class.js";
import { PathQLFieldMissingError } from "pathql/src/PathQL/Error/PathQLFieldMissingError.class.js";
import { PathQLValidationError } from "pathql/src/PathQL/Error/PathQLValidationError.class.js";
import { PathQLError } from "pathql/src/PathQL/Error/PathQLError.class.js";


import Logging from "pathql/etc/data/logging.json" assert {type: "json"};
import Search from "pathql/etc/data/search.json" assert {type: "json"};
import Where from "pathql/etc/data/where.json" assert {type: "json"};


export class PathQLServerEntry {
	static fields = {};
	static prefix = "pql";
	static methods = {};

	/**
	 * @param {JSON} options 
	 */
	constructor(options = {}) {
		if(this.tableName) {
			this.table = this.tableName;
		} else {
			this.table = this.constructor.prefix + "_" + this.constructor.name;
		}

		this.token = options.token != null ? options.token : null;
		this.locks = {};
		this.checkPermission("load", options.request);

		this.logging = Logging[options.logging] != null ? Logging[options.logging] : Logging.ERROR;
		this.isClient = options.isClient ? options.isClient : false;

		this.log("Prove the options variables!");
		if(!this.isClient) {
			if(options.db instanceof Object) {
				this.db = options.db;
			} else {
				this.log("Database is no instance of PathQLDatabaseController", 1);
				throw "Database is no instance of PathQLDatabaseController";
			}
		}
		this.force = options.force ? options.force : false;
		this.storeHistory = options.history ? options.history : false;
		this.historyArray = [];
		this.rollbackArray = [];

		this.log("Load fields, prefix and methods from constructor.");
		this.fields = this.constructor.fields;
		// Prove fields and optional add id and token field
		
		if(this.fields.id == null) {
			this.fields = {
				...{
					id: {
						"type": "Int",
						"db": {
							"primary": true,
							"autoincrement": true
						},
						"fixed": true
					}
				},
				...this.fields
			}
		}

		if(this.fields.token == null) {
			this.fields = {
				...{
					token: {
						"type": "String",
						"fixed": true
					}
				},
				...this.fields
			}
		}

		for(const key in this.fields) {
			if(this.fields[key].type.toUpperCase() == this.db.getType("OBJECT")) {
				this[key] = {};
			}
		}
		this.objects = {};
		this.prefix = this.constructor.prefix;
		this.methods = {
			"search": {},
			"store": {},
			"drop": {},
			"count": {},
			"lockKey": {},
			"unlockKey": {},
			"updateKey": {},
			"isKeyLocked": {}
		};
		this.methods = {
			...this.methods,
			...this.constructor.methods
		}

		this.isLocked = false;
		this.waitForUnlockTimer = 10;
		this.generateDatabaseKeys();
		return this;
	}

	/**
	 * Log a message based on the level
	 * 
	 * @param {String} msg 
	 * @param {Logging} level 
	 */
	log(msg, level = 3) {
		if(level <= this.logging) {
			console.log("[PATHQL] " + msg);
		}
	}

	addPathQLField(_name, _data = {}, _force = false) { }
	removePathQLField(_name, _force = false) { }
	setPathQLPrefix(_name, _force = false) { }
	addPathQLMethod(_name, _data = {}, _force = false) { }
	removePathQLMethod(_name, _force = false) { }

	/**
	 * run an specific sql statement
	 * 
	 * @param {String} statement 
	 * @param {JSON} data 
	 * @returns 
	 */
	async runSQL(statement, data = []) {
		if(this.isClient) {
			return null;
		}

		await this.waitToUnlock();
		this.isLocked = true;
		this.log(`<SQL> ${statement}`);
		this.log(`<SQL DATA> ${JSON.stringify(data)}`);
		const cacheData = await this.db.runPrepared(statement, data);
		this.isLocked = false;
		return cacheData;
	}

	/**
	 * Parse object to JSON
	 * @returns 
	 */
	toJSON() {
		return this.parseToRaw();
	}

	/**
	 * Load object from json
	 * @param {JSON} json 
	 * @returns 
	 */
	async fromJSON(json) {
		if(json.token != null) {
			const object = await new this.constructor({
				db: this.db,
				logging: this.logging,
				force: this.force,
				history: this.storeHistory,
				token: this.token
			});
			return object;
		} else {
			const object = await new this.constructor({
				db: this.db,
				logging: this.logging,
				force: this.force,
				history: this.storeHistory
			});
			await object.parseFromRaw(json);
			return object;
		}
	}

	/**
	 * wait while this sql entry is unlocked
	 * @returns 
	 */
	async waitToUnlock() {
		if(this.isLocked) {
			await new Promise(r => setTimeout(r, this.waitForUnlockTimer));
			return await this.waitToUnlock();
		} else {
			return true;
		}
	}

	/**
	 * If manager exists check if manager checkPermission method return true.
	 * The Permission contains are build <object name>.<specific permission>.<optional specific entry token>
	 * 
	 * @param {String} permission 
	 * @returns 
	 */
	checkPermission(permission, request) {
		let newPermission = `${this.constructor.name}.${permission}`;
		if(this.token != null) {
			newPermission = newPermission + `.${this.token}`;
		}
		if(request != null && request.checkPermission != null) {
			const hasPerm = request.checkPermission(newPermission);
			if(hasPerm) {
				return true;
			} else {
				throw new PathQLNoPermissionError({
					msg: "The user has no permission to do this.",
					permission: newPermission
				});
			}
		} else {
			return true;
		}
	}

	/**
	 * Store the history of this entry
	 *
	 * @returns bool
	 */
	history() {
		if(this.storeHistory) {
			this.historyArray.push(this.parseToRaw());
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Rollback to the last history backup
	 * 
	 * @returns bool
	 */
	async rollback() {
		if(this.storeHistory && this.historyArray.length >= 1) {
			const lastHistory = this.historyArray[(this.historyArray.length - 1)];
			const cacheHistory = this.parseToRaw();
			this.rollbackArray.push(cacheHistory);
			await this.parseFromRaw(lastHistory);
			this.historyArray.pop();
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Rollback forward after a history rollback
	 * 
	 * @returns bool
	 */
	async rollbackForward() {
		if(this.storeHistory && this.rollbackArray.length >= 1) {
			const lastHistory = this.rollbackArray[(this.rollbackArray.length - 1)];
			const cacheHistory = this.parseToRaw();
			this.historyArray.push(cacheHistory);
			await this.parseFromRaw(lastHistory);
			this.rollbackArray.pop();
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Parse all fields from raw json data for example at loading from database or something
	 * @param {json} data 
	 * @returns
	 */
	async parseFromRaw(data = {}) {
		for(const key in data) {
			try {
				if(this.fields[key] != null) {
					const field = this.fields[key];
					const newField = data[key];
					if(field.type.toUpperCase() == this.db.getType("OBJECT")) {
						if(this.validate(newField, this.db.getType("STRING"), key)) {
							this[key][newField] = await new this.objects[field.object]({ db: this.db, token: newField });
						} else if(newField.constructor.name == "Array") {
							for(const token of newField) {
								if(this.validate(token, this.db.getType("STRING"), key)) {
									this[key][token] = await new this.objects[field.object]({ db: this.db, token: token });
								} else {
									this.log(`The field ${key} (object/array) contains an non token element`, 1);
									break;
								}
							}
						} else {
							this.log(`The field ${key} (object) is no token or token array`, 1);
						}
					} else {
						this.validate(newField, this.db.getType(field.type), key);
						this[key] = newField;
					}
				} else {
					this.log(`The field <${key}> does not exists in the server entry ${this.constructor.name}`, 3);
				}
			} catch(e) {
				this.log(`The field <${key}> parsing throws an error: ${e}`, 1);
				if(!this.force) {
					throw e;
				}
			}
		}
		return true;
	}

	/**
	 * Parse all entry fields to an new json object and return it.
	 * @returns 
	 */
	parseToRaw() {
		const raw = {};
		for(const key in this.fields) {
			try {
				const field = this.fields[key];
				if(field.type.toUpperCase() == this.db.getType("OBJECT")) {
					raw[key] = [];
					for(const token in this[key]) {
						if(this.validate(token, this.db.getType("STRING"), key)) {
							raw[key].push(token);
						} else {
							this.log(`The field ${key} (object/array) contains an non token element`, 1);
						}
					}
				} else {
					raw[key] = this[key];
				}
			} catch(e) {
				this.log(`The field ${key} parse to raw throws an error: ${e}`, 1);
				if(!this.force) {
					throw e;
				}
			}
		}
		return raw;
	}

	/**
		* Generate database base from fields
		* TODO: Implement method to prepare fields again SQL Injection
		*/
	generateDatabaseKeys() {
		this.updateColumns = "";
		this.insertColumns = "";
		this.insertValues = "";
		this.selectColumns = "";
		this.selectColumnsArray = [];
		this.objectColumnsArray = [];
		for(const key in this.fields) {
			const field = this.fields[key];
			if(field.type.toUpperCase() != this.db.getType("OBJECT")) {
				if(!field.fixed && this[key]) {
					this.updateColumns = this.updateColumns + key + " = ?, ";
					this.insertColumns = this.insertColumns + key + ", ";
					this.insertValues = this.insertValues + "?, "
				}
				this.selectColumns = this.selectColumns + key + ", ";
				this.selectColumnsArray.push(key);
			} else {
				this.objectColumnsArray.push(key);
			}
		}
		this.updateColumns = this.updateColumns.slice(0, -2);
		this.insertColumns = this.insertColumns.slice(0, -2);
		this.insertValues = this.insertValues.slice(0, -2);
		this.selectColumns = this.selectColumns.slice(0, -2);
	}

	/**
		* Generate Database values for save data
		*/
	generateDatabaseValues() {
		const raw = this.parseToRaw();
		this.preparedSaveData = [];
		for(const key in this.fields) {
			if(raw[key]) {
				const field = this.fields[key];
				if(!field.fixed) {
					if(field.type.toUpperCase() != this.db.getType("OBJECT")) {
						this.preparedSaveData.push(raw[key]);
					}
				}
			}
		}
	}


	/**
	 * Validate a specific value by predefined regex types.
	 * TODO: check if value is null
	 */
	validate(value, type, key) {
		this.log(`Validate ${value} is type ${type.database} in ${key}`, 2);
		if(value == undefined) {
			console.error(value + " : " + key + " is undefined!");
			if(!this.force) {
				throw new PathQLValidationError({ msg: value + " : " + key + " is undefined!" });
			}
			return false;
		}
		if(!type) {
			type = this.db.getType("INT");
		}
		if(value.toString().match(type.regex)) {
			return true;
		} else {
			console.error("Validation failed!");
			if(!this.force) {
				throw new PathQLValidationError({ msg: "Validation failed!" });
			}
			return false;
		}
	}

	/**
	 * Delete method for client
	 */
	async store(_data, request = {}) {
		return await this.save(request);
	}
	
	/**
	 * This method try to create or save the entry in to the database
	 * @returns bool 
	 */
	async save(request = {}) {
		try {
			this.generateDatabaseValues();
			this.generateDatabaseKeys();
			let statement = "";
			if(this.token != null) {
				this.checkPermission("update", request);
				statement = `UPDATE ${this.table} SET ${this.updateColumns} WHERE token = ?;`;
			} else {
				this.token = crypto.randomUUID();
				this.generateDatabaseValues();
				this.generateDatabaseKeys();
				this.checkPermission("create", request);
				statement = `INSERT INTO ${this.table} (${this.insertColumns}, token) VALUES (${this.insertValues}, ?);`;
				this.preparedSaveData.push(this.token);
			}
			const result = await this.runSQL(statement, this.preparedSaveData);
			if(result) {
				if(this.token == null) {
					if(result.cursor != null) {
						const getTokenStatement = `SELECT token FROM ${this.table} WHERE id = ?`;
						const getTokenCursor = await this.runSQL(getTokenStatement, [result.cursor]);
						if(getTokenCursor.result && getTokenCursor.result[0] && getTokenCursor.result[0][0]) {
							this.token = getTokenCursor.result[0][0];
						} else {
							this.log(`The entry ${this.constructor.name} with the id ${result.cursor} does not contains an token in the database!`, 1);
						}
					} else {
						this.log(`The entry ${this.constructor.name} cannot be created in database!`, 1);
					}
				}
				return true;
			} else {
				if(result == null) {
					if(!request.tableIsCreated) {
						await this.createTable();
						request.tableIsCreated = true;
						this.token = null;
						return await this.save(request);
					}
				}
				this.log(`Cannot save the entry into database!`, 1);
				if(!this.force) {
					throw new PathQLDatabaseError({ msg: "Cannot save the entry into database!" });
				}
			}
		} catch(e) {
			this.log(`Error while saving entity ${e}!`, 1);
			if(!this.force) {
				throw new PathQLDatabaseError({ msg: `Error while saving entity ${e}!` });
			}
			return false;
		}
	}

	/**
	 * Delete method for client
	 */
	 async drop(_data, request = {}) {
		return await this.delete(request);
	}

	/**
	 * TODO: Delete all connection from connection objects
	 * Delete an entry by token
	 * @param {Request} request 
	 * @returns 
	 */
	async delete(request = {}) {
		this.checkPermission("delete", request);
		try {
			if(this.token == null) {
				this.log(`Cannot delete object ${this.constructor.name} if it does not contain an token!`);
				if(!this.force) {
					throw new PathQLFieldMissingError({
						msg: `Cannot delete object ${this.constructor.name} if it does not contain an token!`,
						field: "token"
					});
				}
				return false;
			}

			const statement = `DELETE FROM ${this.table} WHERE token = ?;`;
			const result = await this.runSQL(statement, [this.token]);
			if(result != null) {
				return true;
			}
		} catch(e) {
			this.log(`Delete the object ${this.constructor.name} throws an error ${e}`);
			if(!this.force) {
				throw e;
			}
		}
		return false;
	}

	/**
	 * Load an entry from token
	 * @param {Request} request 
	 * @returns 
	 */
	async load(request = {}) {
		this.checkPermission("load", request = {});
		try {
			if(this.token == null) {
				this.log(`Cannot load object ${this.constructor.name} if it does not contain an token!`);
				if(!this.force) {
					throw new PathQLFieldMissingError({
						msg: `Cannot load object ${this.constructor.name} if it does not contain an token!`,
						field: "token"
					});
				}
				return false;
			}

			const statement = `SELECT ${this.selectColumns} FROM ${this.table} WHERE token = ?;`;
			const result = await this.runSQL(statement, [this.token]);
			const data = {};
			if(result.result && result.result.length > 0) {
				let i = 0;
				for(const key of this.selectColumnsArray) {
					if(result.result[0][i]) {
						data[key] = result.result[0][i];
					}
					i++;
				}
			} else {
				throw new PathQLNotExistsError({ msg: `Cannot load object ${this.constructor.name} with token ${this.token}!` });
			}
			await this.parseFromRaw(data);

			// load all connected objects
			for(const key in this.fields) {
				if(this.fields[key].type.toUpperCase() == this.db.getType("OBJECT")) {
					await this.loadAll(key);
				}
			}
			return true;
		} catch(e) {
			this.log(`Load the object ${this.constructor.name} throws an error ${e}`);
			if(!this.force) {
				throw e;
			}
		}
		return false;
	}

	/**
	 * Search specific entrys based on a json search request
	 * @param {JSON} data 
	 * @param {Request} request 
	 * @returns
	 */
	async search(data, request = {}) {
		let statement = `SELECT token FROM ${this.table} `;
		let whereStatement = `WHERE `;
		let searchStatement = ``;
		const searchData = [];
		let whereData = [];

		for(const key in data) {
			const cacheField = data[key];
			const field = this.fields[key];
			// TODO: Move the generation of where and search out to an internal method
			if(Search[key.toUpperCase()]) {
				searchStatement = searchStatement + ` ${Search[key.toUpperCase()]}`;
				searchData.push(cacheField);
			} else if(field && cacheField.type && Where[cacheField.type.toUpperCase()] && cacheField.values && field.type.toUpperCase() != "OBJECT") {
				whereStatement = whereStatement + `${key} ${Where[cacheField.type.toUpperCase()]} AND `;
				for(const value of data[key].values) {
					whereData.push(value);
				}
			} else if(field && data[key].type && Where[data[key].type.toUpperCase()] && data[key].values) {
				const foreignObj = await new this.objects[field.object]({ db: this.db });
				whereStatement = whereStatement + "token IN (SELECT " + this.constructor.name + " FROM " + this.getForeignTableName(foreignObj) + "_" + key + " WHERE " + field.object + " " + Where[data[key].type.toUpperCase()] + ") AND ";
				for(const value of data[key].values) {
					this.validate(value, this.db.getType("STRING"), key);
					whereData.push(value);
				}
			}
		}
		if(whereStatement.length > 8) {
			whereStatement = whereStatement.slice(0, -5);
		} else {
			whereStatement = "";
		}
		statement = statement + whereStatement + searchStatement;
		whereData = whereData.concat(searchData);
		const result = await this.runSQL(statement, whereData);

		// load all objects and store them into array
		const objects = [];
		for(const token of result.result) {
			try {
				if(token[0] != null) {
					const object = await new this.constructor({
						db: this.db,
						logging: this.logging,
						force: this.force,
						history: this.storeHistory,
						token: token[0],
						request: request
					});

					await object.load();
					objects.push(object);
				}
			} catch(e) {
				if(!(e instanceof PathQLNoPermissionError)) {
					throw e;
				}
			}
		}
		return objects;
	}

	/**
	 * Migrate new or removed fields from an entry to an exists table
	 * @param {Request} request 
	 * @param {JSON} options 
	 */
	async migrate(request = {}, options = { fallback: false, drop: false }) {
		// TODO: add these for objects
		this.checkPermission("migrate", request);
		const structure = await this.db.getTableStructure(this.table);
		const backupStructure = {};
		backupStructure.add = [];
		for(const key in this.fields) {
			try {
				const field = this.fields[key];
				if(field.type.toUpperCase() == this.db.getType("OBJECT")) {
					delete (structure[key]);
					continue;
				}
				if(structure[key]) {
					/**
					 * TODO: This feature would be implemented in future versions.
					 * it gives the possibility to copy all data from a field of the database,
					 * delete the old and add a new with other types a.s.o.
					 */
					if(!field.type != structure[key].type) {
						// wrong field type to be
					}
				} else {
					const statement = `ALTER TABLE ${this.table} ADD ${key} ${this.db.getType(field.type).database}`;
					const result = await this.runSQL(statement);
					if(result != null) {
						backupStructure.add.push(key);
						// field missing in table
					} else {
						this.log(`Cannot insert key ${key}!`, 1);
					}
				}
				// remove field from structure
			} catch(e) {
				this.log(`The migration of ${this.table} ${key} throws an error ${e}.`, 1);
				if(options.fallback) {
					this.log(`The fallback mode is activated. Fallback to the old version and stop the migration.`, 1);
					for(const key of backupStructure.add) {
						const statement = `ALTER TABLE ${this.table} DROP COLUMN ${key}`;
						const result = await this.runSQL(statement);
						if(result == null) {
							this.log(`Cannot drop key ${key}!`, 1);
						}
					}
					throw e;
				}
			}
			delete (structure[key]);
		}
		/**
		 * all columns which are not part the entity would be deleted
		 * TODO: add the possibility to backup all types and 
		 */
		if(options.drop) {
			for(const key in structure) {
				const statement = `ALTER TABLE ${this.table} DROP COLUMN ${key}`;
				const result = await this.runSQL(statement);
				if(result == null) {
					this.log(`Cannot drop key ${key}!`, 1);
				}
			}
		}
	}

	/**
	 * Create table
	 * @returns 
	 */
	async createTable() {
		let preparedCreateData = "";
		for(const key in this.fields) {
			const field = this.fields[key];

			if(field.type.toUpperCase() == this.db.getType("OBJECT")) {
				const foreignObj = await new this.objects[field.object]({ db: this.db });
				const table = this.getForeignTableName(foreignObj) + "_" + key;
				const statement = `CREATE TABLE IF NOT EXISTS ${table} (${this.constructor.name} ${this.db.getType("STRING").database}, ${foreignObj.constructor.name} ${this.db.getType("STRING").database});`;
				const result = await this.runSQL(statement);
				if(result == null) {
					this.log(`Cannot create foreign table!`, 1);
				}
				continue;
			}
			let foreign = null;
			preparedCreateData = preparedCreateData + key + " " + this.db.getType(field.type).database;
			for(const option in field.db) {
				if(field.db[option] && this.db.constructor[option.toUpperCase()]) {
					preparedCreateData = preparedCreateData + " ";
					preparedCreateData = preparedCreateData + this.db.constructor[option.toUpperCase()];
					if(option.toUpperCase() == "FOREIGN") {
						const cacheObj = await new field.db[option]({ "db": this.db });
						foreign = cacheObj.table + "(token)";
					}
				}
			}

			preparedCreateData = preparedCreateData + ", ";
			if(foreign != null) {
				preparedCreateData = preparedCreateData + `FOREIGN KEY (${key}) REFERENCES ${foreign}`;
			}
		}
		preparedCreateData = preparedCreateData.slice(0, -2);

		const statement = `CREATE TABLE IF NOT EXISTS ${this.table} (${preparedCreateData});`;
		const result = await this.runSQL(statement);
		return result;
	}

	/**
	 * Compare a PathQLServerEntry name with this entity server entry name and return a foreign table
	 * @param {Object} object 
	 * @returns 
	 */
	getForeignTableName(object) {
		const name1 = this.constructor.name;
		const name2 = object.constructor.name;
		let name = this.prefix + "_" + name1 + name2;
		if(name1 < name2) {
			name = object.prefix + "_" + name2 + name1;
		}
		return name;
	}

	/**
	 * Add an entity by key and token
	 * @param {JSON} data (key, token)
	 * @param {Request} request 
	 * @returns 
	 */
	async add(data, request = {}) {
		const key = data.key;
		const tokenOrObject = data.token;
		this.checkPermission(`${key}.add`, request);
		if(this.token != null) {
			try {
				let token = tokenOrObject;
				if(typeof(tokenOrObject) == "object") {
					token = tokenOrObject.token;
				}
				const field = this.fields[key];
				if(this[key] == null) {
					this[key] = {};
				}
				if(this[key][token] == null) {
					this[key][token] = await new this.objects[field.object]({ db: this.db, token: token });
				}
				const table = this.getForeignTableName(this[key][token]) + "_" + key;
				const statement = `INSERT INTO ${table} (${this.constructor.name}, ${this[key][token].constructor.name}) VALUES (?, ?);`;
				const result = await this.runSQL(statement, [this.token, token]);
				if(result != null) {
					return true;
				}
			} catch(e) {
				this.log(`Add an entry failed with error ${e}`);
				if(!this.force) {
					throw e;
				}
			}
		} else {
			this.log(`Cannot add an entry if the entity ${this.constructor.name} has no token!`);
			if(!this.force) {
				throw new PathQLFieldMissingError({ msg: `Cannot add an entry if the entity ${this.constructor.name} has no token!` });
			}
		}
		return false;
	}

	/**
	 * Remove an entity by key and token
	 * @param {JSON} data (key, token)
	 * @param {Request} request 
	 * @returns 
	 */
	async remove(data, request = {}) {
		const key = data.key;
		const tokenOrObject = data.token;
		this.checkPermission(`${key}.remove`, request);
		if(this.token != null) {
			try {
				let token = tokenOrObject;
				if(typeof(tokenOrObject) == "object") {
					token = tokenOrObject.token;
				}
				const field = this.fields[key];
				if(this[key][token] == null) {
					this[key][token] = await new this.objects[field.object]({ db: this.db, token: token });
				}
				const table = this.getForeignTableName(this[key][token]) + "_" + key;
				const statement = `DELETE FROM ${table} WHERE ${this.constructor.name}=? AND ${this[key][token].constructor.name}=?;`;
				const result = await this.runSQL(statement, [this.token, token]);
				delete (this[key][token]);
				if(result != null) {
					return true;
				}
			} catch(e) {
				this.log(`Remove an entry failed with error ${e}`);
				if(!this.force) {
					throw e;
				}
			}
		} else {
			this.log(`Cannot remove an entry if the entity ${this.constructor.name} has no token!`);
			if(!this.force) {
				throw new PathQLFieldMissingError({ msg: `Cannot remove an entry if the entity ${this.constructor.name} has no token!` });
			}
		}
		return true;
	}

	/**
	 * Remove all entitys by key and token
	 * @param {JSON} data (key, token)
	 * @param {Request} request 
	 * @returns 
	 */
	async removeAll(data, request = {}) {
		const key = data.key;
		const token = data.token;
		this.checkPermission(`${key}.removeAll`, request);
		try {
			const field = this.fields[key];
			if(this[key][token] == null) {
				this[key][token] = await new this.objects[field.object]({ db: this.db, token: token });
			}
			const table = this.getForeignTableName(this[key][token]) + "_" + key;
			const statement = `DELETE FROM ${table} WHERE ${this[key][token].constructor.name}=?;`;
			const result = await this.runSQL(statement, [token]);
			return result;
		} catch(e) {
			this.log(`Remove all entrys failed with error ${e}`);
			if(!this.force) {
				throw e;
			}
			return null;
		}
	}

	/**
	 * Load all fields from a key
	 * @param {String} key 
	 * @returns 
	 */
	async loadAll(key, request = {}) {
		this.checkPermission(`${key}.loadAll`, request);
		try {
			const field = this.fields[key];
			const foreignObj = await new this.objects[field.object]({ "db": this.db });
			const table = this.getForeignTableName(foreignObj) + "_" + key;
			const statement = `SELECT ${foreignObj.constructor.name} FROM ${table} WHERE ${this.constructor.name}=?;`;
			const result = await this.runSQL(statement, [this.token]);
			if(result != null && result.result != null && result.result[0] != null) {
				for(const token of result.result[0]) {
					this[key][token] = await new this.objects[field.object]({ "db": this.db, "token": token });
					await this[key][token].load();
				}
			}
			return true;
		} catch(e) {
			this.log(`Load all entrys failed with error ${e}`);
			if(!this.force) {
				throw e;
			}
			return null;
		}
	}

	/**
	 * Parse a json request
	 * @param {Request} request 
	 * @returns 
	 */
	async parseRequest(request = {}) {
		try {
			let data = {};
			const fields = {};
			this.log(`Parse Request ${JSON.stringify(request)}`, 3);
			if(request.data.token != null && request.data.token != "") {
				this.token = request.data.token;
				await this.load();
			}
			for(const key in request.data) {
				this.checkPermission(key, request);
				if(this.fields[key] != null) {
					if(request.data[key] != "") {
						this[key] = request.data[key];
					}
					fields[key] = request.data[key];
					data[key] = this[key];
				} else if(this.methods[key]) {
					if(typeof(this[key]) == "function") {
						data[key] = await this[key](request.data[key], request);
					} else {
						this.log(`The method ${key} is no function!`, 3);
						data[key] = null;
					}
				} else {
					this.log(`The key ${key} is no function and no key in object!`, 3)
				}
			}

			if(request.data.token != null && request.data.token != "") {
				const jsonData = await this.getFieldJSON(fields, request);
				data = {
					...data,
					...jsonData
				}
			}
			return data;
		}catch(e) {
			this.log(`Parse Request failed with ${e}`);
			if(!this.force) {
				throw e;
			}
		}
	}

	/**
	 * Get object as JSON
	 * @param {JSON} fields 
	 * @param {Request} request 
	 * @returns 
	 */
	async getFieldJSON(fields, request = {}) {
		const obj = await new this.constructor({ db: this.db, token: fields.token });
		if(!await obj.load(request)) {
			throw new PathQLNotExistsError({ msg: `object ${obj.constructor.name} with token ${obj.token} not found` });
		}

		const data = {};
		for(const key in fields) {
			// Check permission ?
			const value = obj.fields[key];
			if(value.type.toUpperCase() == "OBJECT") {
				if(!fields[key]) {
					fields[key] = {};
				}
				if(!fields[key].data) {
					const cacheFields = JSON.parse(JSON.stringify(fields[key]));
					fields[key].data = cacheFields;
				}
				fields[key].settings = request.settings;
				data[key] = [];
				for(const token in obj[key]) {
					data[key].push(await obj[key][token].parseRequest(fields[key]));
				}
			} else {
				data[key] = obj[key];
			}
		}
		return data;
	}

	/**
	 * Methods to handle the update of an single key and the lock of an single key
	 */
	/**
	 * Lock an specific key
	 * @param {String} key 
	 * @param {JSON} request 
	 * @returns 
	 */
	async lockKey(key, request = {}) {
		this.checkPermission(`${key}.lock.close`, request);
		console.log(request);
		if(this.fields[key] != null) {
			if(!this.locks[key]) {
				if(request.settings && request.settings.connection && request.settings.connection.edits) {
					request.settings.connection[this.token] = key;
				}
				this.locks[key] = true;
				return true;
			} else {
				return false;
			}
		} else {
			this.log(`Cannot find key ${key} to lock.`, 2);
		}
		return false;
	}

	/**
	 * Lock a specific key
	 * @param {String} key 
	 * @param {Request} request 
	 * @returns 
	 */
	async unlockKey(key, request = {}) {
		this.checkPermission(`${key}.lock.open`, request);
		if(this.fields[key] != null) {
			if(this.locks[key]) {
				if(request.settings && request.settings.connection && request.settings.connection.edits) {
					delete(request.settings.connection.edits[this.token]);
				}
				this.locks[key] = false;
				return true;
			} else {
				return false;
			}
		} else {
			this.log(`Cannot find key ${key} to unlock.`, 2);
		}
		return false;
	}

	/**
	 * Check if a specific key is locked
	 * @param {String} key 
	 * @param {Request} request 
	 * @returns 
	 */
	isKeyLocked(key, request = {}) {
		this.checkPermission(`${key}.lock.check`, request);
		this.log(`The lock of ${key} is ${this.locks[key]}!`);
		return this.locks[key];
	}

	/**
	 * Update an specific key
	 * @param {JSON} data 
	 * @param {Request} request 
	 * @returns 
	 */
	async updateKey(data, request = {}) {
		if(this.token == null) {
			this.log(`Cannot update object ${this.constructor.name} without token!`);
			throw new PathQLNotExistsError({ msg: `Cannot update object ${this.constructor.name} without token!` });
		}
		const key = data.key;
		const value = data.value;
		this.checkPermission(`${key}.update`, request);
		const field = this.fields[key];
		if(field == null) {
			throw new PathQLFieldMissingError({msg: `The field for ${key} does not exists`});
		}
		if(field.fixed) {
			throw new PathQLError({msg: `The field for ${key} is static you can't update it!`});
		}

		this.validate(value, this.db.getType(field.type), key);
		if(!this.isKeyLocked(key, request)) {
			try {
				const statement = `UPDATE ${this.table} SET ${key} = ? WHERE token = ?;`
				await this.runSQL(statement, [value, this.token]);
			} catch(e) {
				this.log(`Update key ${key} failed with ${e}`);
				if(!this.force) {
					throw e;
				}
				return null;
			}
		} else {
			this.log(`Key is locked at the moment.`, 2);
			return false;
		}
	}

	/**
	 * count all elements by by different parameters
	 */
	async count(data, request = {}) {
		this.checkPermission("count", request);
		let statement = `SELECT COUNT(id) FROM ` + this.table;
		let whereStatement = " WHERE ";
		let isWhere = false;
		const whereData = [];
		if(data) {
			for(const key in data) {
				if(key == "data") {
					continue;
				}
				if(this.fields[key] != null && data[key].type != null && Where[data[key].type.toUpperCase()] != null && data[key].values != null) {
					isWhere = true;
					whereStatement = whereStatement + key + " " + Where[data[key].type.toUpperCase()] + " AND ";
					for(const value of data[key].values) {
						whereData.push(value);
					}
				}
			}
			whereStatement = whereStatement.slice(0, -5);
			if(!isWhere) {
				whereStatement = "";
			}
			statement = statement + whereStatement + ";";
			const result = await this.db.runPrepared(statement, whereData);
				return result.result[0][0];
		}
	}	
}