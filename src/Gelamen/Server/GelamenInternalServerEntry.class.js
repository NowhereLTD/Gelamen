/**
 * A GelamenServerEntry represent a table or an entry
 * 
 * It can contains "standard" fields like Strings, Booleans, Integer ...
 * or "Object" fields, which represent a array or a single GelamenServerEntry
 * based on foreign tables.
 * 
 * The goals of the project are robustness, speed, Avoid redundant data.
 * 
 * Futuremore handles the GelamenServerEntry requests, permissions and history
 *
 */
import {GelamenDatabaseError} from "gelamen/src/Gelamen/Error/GelamenDatabaseError.class.js";
import {GelamenNotExistsError} from "gelamen/src/Gelamen/Error/GelamenNotExistsError.class.js";
import {GelamenNoPermissionError} from "gelamen/src/Gelamen/Error/GelamenNoPermissionError.class.js";
import {GelamenFieldMissingError} from "gelamen/src/Gelamen/Error/GelamenFieldMissingError.class.js";
import {GelamenValidationError} from "gelamen/src/Gelamen/Error/GelamenValidationError.class.js";
import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

import Logging from "gelamen/etc/data/logging.json" assert {type: "json"};

export class GelamenInternalServerEntry extends EventTarget {
	static fields = {};
	static prefix = "pql";
	static methods = {};

	/**
	 * @param {JSON} options 
	 */
	constructor(options = {}) {
		super();
		if(this.tableName) {
			this.table = this.tableName;
		} else {
			this.table = this.constructor.prefix + "_" + this.constructor.name;
		}

		this.token = options.token != null ? options.token : null;
		this.locks = {};
		this.checkPermission("init", options.request);

		this.logging = Logging[options.logging] != null ? Logging[options.logging] : Logging.ERROR;
		this.isClient = options.isClient ? options.isClient : false;
		this.doCheckPermissions = options.doCheckPermissions != null ? options.doCheckPermissions : true;

		this.log("Prove the options variables!");
		if(!this.isClient) {
			if(options.db instanceof Object) {
				this.db = options.db;
			} else {
				this.log("Database is no instance of GelamenDatabaseController", 1);
				throw new GelamenDatabaseError({msg: "Database is no instance of GelamenDatabaseController"});
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
			"create": {},
			"get": {},
			"drop": {},
			"count": {},
			"lockKey": {},
			"unlockKey": {},
			"updateKey": {},
			"isKeyLocked": {},
			"add": {},
			"remove": {}
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
		try {
			if(level <= this.logging) {
				console.log("[GELAMEN] ", msg);
			}
		} catch(_e) {
			return false;
		}
	}

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
		if(cacheData) {
			this.log(`<SQL RETURN> ${JSON.stringify(cacheData)}`);
		} else {
			this.log(`<SQL RETURN> Error`);
		}
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
				token: this.token,
				doCheckPermissions: this.doCheckPermissions
			});
			return object;
		} else {
			const object = await new this.constructor({
				db: this.db,
				logging: this.logging,
				force: this.force,
				history: this.storeHistory,
				doCheckPermissions: this.doCheckPermissions
			});
			await object.parseFromRaw(json);
			return object;
		}
	}

	/**
	 * wait while this sql entry is unlocked
	 * Handle this with a deno file watcher!
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
	checkPermission(permission, request = {}) {
		if(!this.doCheckPermissions) {
			return true;
		}
		if(request && request.settings && request.settings.connection && request.settings.connection.hasPermission) {
			const newPermission = `${this.constructor.name}.${permission}`;
			const hasPerm = request.settings.connection.hasPermission(newPermission, this);
			if(hasPerm) {
				return true;
			} else {
				throw new GelamenNoPermissionError({
					msg: "The user has no permission to do this.",
					permission: newPermission
				});
			}
		}
		this.log(`Check Permission ${permission} failed!`, 5);
		throw new GelamenNoPermissionError({
			msg: "The user has no permission to do this.",
			permission: permission
		});
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
							this[key][newField] = await new this.objects[field.object]({db: this.db, token: newField});
						} else if(newField.constructor.name == "Array") {
							for(const token of newField) {
								if(this.validate(token, this.db.getType("STRING"), key)) {
									this[key][token] = await new this.objects[field.object]({db: this.db, token: token});
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
					throw new GelamenError(`Parsing failed with ${e}`);
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
				if(!field.fixed && this[key] != null) {
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
				throw new GelamenValidationError({msg: value + " : " + key + " is undefined!"});
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
				throw new GelamenValidationError({msg: "Validation failed!"});
			}
			return false;
		}
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
			if(this.token != null && this.token != "") {
				this.checkPermission("update", request);
				statement = `UPDATE ${this.table} SET ${this.updateColumns} WHERE token = ?;`;
				this.preparedSaveData.push(this.token);
			} else {
				this.token = crypto.randomUUID();
				this.generateDatabaseValues();
				this.generateDatabaseKeys();
				this.checkPermission("create", request);
				this.insertColumns = this.insertColumns != "" ? this.insertColumns + ", token" : "token";
				this.insertValues = this.insertValues != "" ? this.insertValues + ", ?" : "?";
				statement = `INSERT INTO ${this.table} (${this.insertColumns}) VALUES (${this.insertValues});`;
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
				if(result == null && !request.tableIsCreated) {
					await this.createTable();
					request.tableIsCreated = true;
					this.token = null;
					return await this.save(request);
				}
				this.log(`Cannot save the entry into database!`, 1);
				if(!this.force) {
					throw new GelamenDatabaseError({msg: "Cannot save the entry into database!"});
				}
			}
		} catch(e) {
			this.log(`Error while saving entity ${e}!`, 1);
			if(!this.force) {
				throw e;
			}
			return false;
		}
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
					throw new GelamenFieldMissingError({
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
		this.checkPermission("load", request);
		try {
			if(this.token == null) {
				this.log(`Cannot load object ${this.constructor.name} if it does not contain an token!`);
				if(!this.force) {
					throw new GelamenFieldMissingError({
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
						//if(this.fields[key].db != null && this.fields[key].db["FOREIGN"] && this.fields[key].object)
						data[key] = result.result[0][i];
					}
					i++;
				}
			} else {
				throw new GelamenNotExistsError({msg: `Cannot load object ${this.constructor.name} with token ${this.token}!`});
			}
			await this.parseFromRaw(data);

			// load all connected objects
			for(const key in this.fields) {
				if(this.fields[key].type.toUpperCase() == this.db.getType("OBJECT")) {
					await this.loadAll(key, request);
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
	 * Migrate new or removed fields from an entry to an exists table
	 * @param {Request} request 
	 * @param {JSON} options 
	 */
	async migrate(request = {}, options = {fallback: false, drop: false}) {
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
				const foreignObj = await new this.objects[field.object]({db: this.db});
				const table = this.getForeignTableName(foreignObj) + "_" + key;
				const statement = `CREATE TABLE IF NOT EXISTS ${table} (${this.constructor.name} ${this.db.getType("STRING").database}, ${foreignObj.constructor.name}Foreign ${this.db.getType("STRING").database});`;
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
						const cacheObj = await new field.db[option]({"db": this.db});
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
	 * Compare a GelamenServerEntry name with this entity server entry name and return a foreign table
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
				await this.load(request);
			}
			for(const key in request.data) {
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
		} catch(e) {
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
		const obj = await new this.constructor({db: this.db, token: fields.token, doCheckPermissions: this.doCheckPermissions});
		if(!await obj.load(request)) {
			throw new GelamenNotExistsError({msg: `object ${obj.constructor.name} with token ${obj.token} not found`});
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
}