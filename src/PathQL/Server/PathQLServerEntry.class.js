/**
 * A PathQLServerEntry represent a table or an entry
 * 
 * This Entry includes all methods that are directly available for the client.
 */
import {PathQLNotExistsError} from "pathql/src/PathQL/Error/PathQLNotExistsError.class.js";
import {PathQLNoPermissionError} from "pathql/src/PathQL/Error/PathQLNoPermissionError.class.js";
import {PathQLFieldMissingError} from "pathql/src/PathQL/Error/PathQLFieldMissingError.class.js";
import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";
import {InternalPathQLServerEntry} from "./InternalPathQLServerEntry.class.js"

import Search from "pathql/etc/data/search.json" assert {type: "json"};
import Where from "pathql/etc/data/where.json" assert {type: "json"};


export class PathQLServerEntry extends InternalPathQLServerEntry {
	/**
	 * @param {JSON} options 
	 */
	constructor(options = {}) {
		super(options);
	}

	addPathQLField(_name, _data = {}, _force = false) {}
	removePathQLField(_name, _force = false) {}
	setPathQLPrefix(_name, _force = false) {}
	addPathQLMethod(_name, _data = {}, _force = false) {}
	removePathQLMethod(_name, _force = false) {}

	/**
	 * Store method for client
	 */
	async store(_data, request = {}) {
		this.checkPermission("store", request);
		const saveRequest = await this.save(request);
		if(saveRequest) {
			// permission check
			return [this.parseToRaw()];
		} else {
			throw new PathQLError({msg: `Error while store entity!`});
		}
	}

	/**
	 * A simple method to get an object
	 * @param {JSON} _data 
	 * @param {JSON} request 
	 * @returns 
	 */
	async get(_data, request = {}) {
		this.checkPermission("get", request);
		await this.load(request);
		return this.toJSON();
	}

	/**
	 * Create method for client
	 */
	async create(_data, request = {}) {
		this.checkPermission("create", request);
		this.token = crypto.randomUUID();
		const statement = `INSERT INTO ${this.table} (token) VALUES (?);`;
		const result = await this.runSQL(statement, [this.token]);
		if(result) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Delete method for client
	 */
	async drop(_data, request = {}) {
		this.checkPermission("drop", request);
		return await this.delete(request);
	}

	/**
	 * Search specific entrys based on a json search request
	 * @param {JSON} data 
	 * @param {Request} request 
	 * @returns
	 */
	async search(data, request = {}) {
		this.checkPermission("search", request);
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
				const foreignObj = await new this.objects[field.object]({db: this.db});
				whereStatement = whereStatement + `token IN (SELECT ${this.constructor.name} FROM ${this.getForeignTableName(foreignObj)}_${key} WHERE ${field.object}Foreign ${Where[data[key].type.toUpperCase()]}) AND `;
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
						doCheckPermissions: this.doCheckPermissions,
						token: token[0],
						request: request
					});

					await object.load(request);
					objects.push(object);
				} else {
					this.log(`Cannot load user from ${token}`)
				}
			} catch(e) {
				this.log(e);
				if(!(e instanceof PathQLNoPermissionError)) {
					throw e;
				}
			}
		}
		return objects;
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
					this[key][token] = await new this.objects[field.object]({db: this.db, token: token});
				}
				const table = this.getForeignTableName(this[key][token]) + "_" + key;
				const statement = `INSERT INTO ${table} (${this.constructor.name}, ${this[key][token].constructor.name}Foreign) VALUES (?, ?);`;
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
				throw new PathQLFieldMissingError({msg: `Cannot add an entry if the entity ${this.constructor.name} has no token!`});
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
					this[key][token] = await new this.objects[field.object]({db: this.db, token: token});
				}
				const table = this.getForeignTableName(this[key][token]) + "_" + key;
				const statement = `DELETE FROM ${table} WHERE ${this.constructor.name}=? AND ${this[key][token].constructor.name}Foreign=?;`;
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
				throw new PathQLFieldMissingError({msg: `Cannot remove an entry if the entity ${this.constructor.name} has no token!`});
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
				this[key][token] = await new this.objects[field.object]({db: this.db, token: token});
			}
			const table = this.getForeignTableName(this[key][token]) + "_" + key;
			const statement1 = `DELETE FROM ${table} WHERE ${this[key][token].constructor.name}=?;`;
			const result1 = await this.runSQL(statement1, [token]);
			const statement2 = `DELETE FROM ${table} WHERE ${this[key][token].constructor.name}Foreign=?;`;
			const result2 = await this.runSQL(statement2, [token]);
			return {
				result1,
				result2
			};
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
			const foreignObj = await new this.objects[field.object]({"db": this.db});
			const table = this.getForeignTableName(foreignObj) + "_" + key;
			const statement = `SELECT ${foreignObj.constructor.name}Foreign FROM ${table} WHERE ${this.constructor.name}=?;`;
			const result = await this.runSQL(statement, [this.token]);
			this.log(result);
			if(result != null && result.result != null && result.result[0] != null) {
				this[key] = {};
				for(const tokenEl of result.result) {
					const token = tokenEl[0];
					this.log("Load " + token);
					this[key][token] = await new this.objects[field.object]({"db": this.db, "token": token, doCheckPermissions: this.doCheckPermissions});
					await this[key][token].load(request);
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
	 * Methods to handle the update of an single key and the lock of an single key
	 */
	/**
	 * Lock an specific key
	 * @param {String} key 
	 * @param {JSON} request 
	 * @returns 
	 */
	lockKey(key, request = {}) {
		this.checkPermission(`${key}.lock.close`, request);
		if(this.fields[key] != null) {
			if(!this.locks[key]) {
				if(request.settings && request.settings.connection && request.settings.connection.edits) {
					request.settings.connection.edits[this.token] = key;
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
	unlockKey(key, request = {}) {
		this.checkPermission(`${key}.lock.open`, request);
		if(this.fields[key] != null) {
			if(this.locks[key]) {
				if(request.settings && request.settings.connection && request.settings.connection.edits) {
					delete (request.settings.connection.edits[this.token]);
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
			throw new PathQLNotExistsError({msg: `Cannot update object ${this.constructor.name} without token!`});
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
				this.dispatchEvent(new CustomEvent("run", {detail: {key: key, value: value, cmd: "updateKey", permission: `${key}.update`}}));
				return true;
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