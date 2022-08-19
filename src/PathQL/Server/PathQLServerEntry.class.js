/**
 * A PathQLServerEntry represent a table or an entry
 * 
 * It can contains "standard" fields like Strings, Booleans, Integer ...
 * or "Object" fields, which represent a array or a single PathQLServerEntry
 * based on foreign tables.
 * 
 * Futuremore handles the PathQLServerEntry requests, permissions and history
 */

import {PathQLTypeError} from "pathql/src/PathQL/Error/PathQLTypeError.class.js";
import {PathQLNotExistsError} from "pathql/src/PathQL/Error/PathQLNotExistsError.class.js";
//import {PathQLAlredyExistsError} from "pathql/src/PathQL/Error/PathQLAlredyExistsError.class.js";
import {PathQLDatabaseError} from "pathql/src/PathQL/Error/PathQLDatabaseError.class.js";
import Types from "pathql/etc/data/types.json" assert {type: "json"};
import Search from "pathql/etc/data/search.json" assert {type: "json"};
import Where from "pathql/etc/data/where.json" assert {type: "json"};

/**
 * Init: Parse from raw, sync from database
 * Save: Parse to raw, sync to database
 */
export class PathQLServerEntry {

	static fields = {};
	static prefix = "pql";

	// pathql
	static methods = {
		"search": {},
		"count": {},
		"addObj": {},
		"rmObj": {}
	};

	constructor(options, db, debug = false) {
		this.options = options;
		this.db = db;
		this.debug = debug;
		this.connections = [];
		this.cObj = {};
		// Predefine a static table name by use tableName
		if(this.tableName) {
			this.table = this.tableName;
		}else {
			this.table = this.constructor.prefix + "_" + this.constructor.name;
		}
		this.generateDatabaseKeys();

		for(const key in this.constructor.fields) {
			if(this.options[key]) {
				if(this.options[key].value) {
					this["raw" + key] = this.options[key].value;
				}else {
					this["raw" + key] = this.options[key];
				}
			}
		}
	}

	/**
	 * Method to parse all fields from raw fields
	 */
	async parseFromRaw(refresh = false) {
		for(const key in this.constructor.fields) {
			if(this["raw" + key] && (!this[key] || refresh)) {
				const field = this.constructor.fields[key];
				if(field.type.toUpperCase() == "OBJECT" && field.object) {
					if(!this.objects[field.object]) {
						throw new PathQLTypeError({msg: "object is not given in model please check your objects field"});
					}
					const cacheRaw = typeof(this["raw" + key]) != "string" ? this["raw" + key] : JSON.parse(this["raw" + key]);
					if(field.array) {
						this[key] = {};
						for(const objectId of cacheRaw) {
							this.validate(objectId, Types.INT, key);
							this[key][objectId] = await new this.objects[field.object]({id: objectId}, this.db);
						}
					}else {
						this.validate(cacheRaw, Types.INT, key);
						this[key] = await new this.objects[field.object]({id: cacheRaw}, this.db);
					}
				}else {
					this.validate(this["raw" + key], Types[field.type.toUpperCase()], key);
					this[key] = this["raw" + key];
				}
			}
		}
		return true;
	}

	/**
	 * Method to parse all fields to raw fields
	 */
	parseToRaw(refresh = true) {
		for(const key in this.constructor.fields) {
			if(this[key] && (!this["raw" + key] || refresh)) {
				const field = this.constructor.fields[key];
				if(field.type.toUpperCase() == "OBJECT") {
					if(field.array) {
						if(this[key] && this[key].constructor.name != "Array" && typeof(this[key]) != "object") {
							const cacheId = this.options[key] ? this.options[key].id : null;
							throw new PathQLTypeError({msg: "element is no array or object", id: cacheId});
						}
						this["raw" + key] = [];
						for(const object in this[key]) {
							this.validate(object, Types.INT, key);
							this["raw" + key].push(object);
						}
						this["raw" + key] = JSON.stringify(this["raw" + key]);
					}else {
						this.validate(this[key].id, Types.INT, key);
						this["raw" + key] = this[key].id;
					}
				}else {
					if(this[key]) {
						this.validate(this[key], Types[field.type.toUpperCase()], key);
						this["raw" + key] = this[key];
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
		if(value == undefined) {
			console.error(value + " : " + key + " is undefined!");
			return false;
		}
		if(!type) {
			type = Types.INT;
		}
		if(value.toString().match(type.regex)) {
			return true;
		}
		if(this.options[key]) {
			throw new PathQLTypeError({msg: "element is no object", id: this.options[key].id});
		}else {
			throw new PathQLTypeError({msg: "element " + key + " is not exists"});
		}
	}

	/**
	 * On dynamic changes at model for example keys or something
	 */
	refreshModel() {
		this.generateDatabaseKeys();
	}

	/**
	 * DATABASE HANDLING
	 * TODO: Implement load all and search/paginate entry, create, update and delete table
	 */

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
			for(const key in this.constructor.fields) {
					const field = this.constructor.fields[key];
					if(field.type.toUpperCase() != "OBJECT") {
						if(key != "id" && this[key]) {
							this.updateColumns = this.updateColumns + key + " = ?, ";
							this.insertColumns = this.insertColumns + key + ", ";
							this.insertValues = this.insertValues + "?, "
						}
						this.selectColumns = this.selectColumns + key + ", ";
						this.selectColumnsArray.push(key);
					}else {
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
			this.preparedSaveData = [];
			for(const key in this.constructor.fields) {
				if(this["raw" + key]) {
					const field = this.constructor.fields[key];
					if(key != "id") {
						if(field.type.toUpperCase() != "OBJECT") {
							this.preparedSaveData.push(this["raw" + key]);
						}
					}
				}
			}
		}

		/**
		* Method to load a entry by id
		*/
		async load(refresh = false) {
			//fieldList = this.fieldList.slice(0, -2);
			const statement = `SELECT ${this.selectColumns} FROM ${this.table} WHERE id = ?;`;
			const result = await this.db.runPrepared(statement, [this.id]);
			if(result.result && result.result.length > 0) {
				let i = 0;
				for(const key of this.selectColumnsArray) {
					if(result.result[0][i]) {
						this["raw" + key] = result.result[0][i];
					}
					i++;
				}

				// load the object data from foreign table
				await this.loadObjectsFromForeignTables();
				if(await this.parseFromRaw(refresh)) {
					return true;
				}
			}
			return false;
		}

		/**
		* Method to check if entry exists
		*/
		async exists() {
			const statement = `SELECT id FROM ${this.table} WHERE id = ?;`;
			const result = await this.db.runPrepared(statement, [this.id]);
			if(result != null) {
				return true;
			}
			return false;
		}

	/**
	* Method to save data in database
	*/
	async save() {
		try {
			await this.parseToRaw();
			this.generateDatabaseValues();

			let statement = "";
			if(this.id || !(await this.exists()) && this.updateColumns) {
				statement = `UPDATE ${this.table} SET ${this.updateColumns} WHERE id = ?;`;
				this.preparedSaveData.push(this.id);
			}else if(this.insertColumns) {
				statement = `INSERT INTO ${this.table} (${this.insertColumns}) VALUES (${this.insertValues});`;
			}

			if(statement === "") {
				return null;
			}
			console.log("yes");
			const result = await this.db.runPrepared(statement, this.preparedSaveData);
			if(result) {
				if(!this.id && result.cursor) {
					this.id = result.cursor;
				}

				await this.createAllConnectionObjects();
				await this.saveAllConnectionObjects();
				return result;
			}else {
				throw new PathQLDatabaseError({msg: "cannot save the entry into database!"});
			}
		} catch (e) {
			console.error(e);
			throw new PathQLDatabaseError({msg: "cannot save the entry into database! [" + e.message + "]"});
		}
	}

	/**
	 * Delete entry from table
	 */
	async delete() {
		await this.createAllConnectionObjects();
		const statement = `DELETE FROM ${this.table} WHERE id = ?;`;
		const result = await this.db.runPrepared(statement, [this.id]);
		for(const connectionObj in this.cObj) {
			this.cObj[connectionObj].removeConnection(this);
		}
		return result;
	}

	/**
	 * Init object
	 */
	async init() {
		await this.createTable();
		this.generateDatabaseKeys();
		await this.createAllConnectionObjects();
	}

	/**
	 * Create table
	 */
	async createTable() {
		let preparedCreateData = "";
		for(const key in this.constructor.fields) {
			const field = this.constructor.fields[key];

			if(field.type.toUpperCase() == "OBJECT") {
				continue;
			}
			let foreign = null;
			preparedCreateData = preparedCreateData + key + " " + Types[field.type.toUpperCase()].database;
			for(const option in field.db) {
				if(field.db[option] && this.db.constructor[option.toUpperCase()]) {
					preparedCreateData = preparedCreateData + " ";
					preparedCreateData = preparedCreateData + this.db.constructor[option.toUpperCase()];
					if(option.toUpperCase() == "FOREIGN") {
						const cacheObj = new field.db[option]({}, this.db);
						foreign = cacheObj.table + "(id)";
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
		const result = await this.db.runPrepared(statement, []);
		return result;
	}

	/**
	 * Push method only for foreign objects
	 */
	async connect(obj1, obj2) {
		try {
			const base = await new this.constructor({}, this.db);
			base[obj1.constructor.name + "Id"] = obj1.id;
			base[obj2.constructor.name + "Id"] = obj2.id;
			const statement = `SELECT * FROM ` + base.table + ` WHERE ` + obj1.constructor.name + `Id` + ` = ? AND ` + obj2.constructor.name + `Id` + ` = ?;`;
			const result = await this.db.runPrepared(statement, [obj1.id, obj2.id]);
			if(result.result.length == 0) {
				await base.save();
				return base;
			}
			// connection alredy exists
			return null;
		}catch(e) {
			console.error(e);
		}
	}

	/**
	 * disconnect connection between two objects
	 */
	async disconnect(obj1, obj2) {
		const statement = `DELETE FROM ` + this.table + ` WHERE ` + obj1.constructor.name + `Id` + ` = ? AND ` + obj2.constructor.name + `Id` + ` = ?;`;
		const result = await this.db.runPrepared(statement, [obj1.id, obj2.id]);
		return result;
	}

	/**
	 * Remove connection
	 */
	async removeConnection(obj) {
		const statement = `DELETE FROM ` + this.table + ` WHERE ` + obj.constructor.name + `Id` + ` = ?;`;
		const result = await this.db.runPrepared(statement, [obj.id]);
		return result;
	}

	/**
	 * get all connections objects
	 */
	async getConnections(obj1, obj2) {
		const statement = `SELECT ` + obj1.constructor.name + `Id FROM ` + this.table + ` WHERE ` + obj2.constructor.name + `Id` + ` = ?;`;
		const result = await this.db.runPrepared(statement, [obj2.id]);
		const objectList = [];
		for(const id of result.result) {
			if(id) {
				const cacheObj = await new obj1.constructor({id: id[0]}, this.db);
				await cacheObj.load();
				objectList.push(cacheObj)
			}
		}
		return objectList;
	}

	async createConnectionObject(key) {
		const field = this.constructor.fields[key];
		if(!this.objects[field.object]) {
			throw new PathQLTypeError({msg: "object is not given in model please check your static objects field"});
		}
		const obj = await new this.objects[field.object]();
		const thisName = this.constructor.name;
		const objName = obj.constructor.name;
		
		let foreignObjectName = obj.constructor.prefix + "_" + objName + "_" + thisName + "_" + key;
		if(thisName.localeCompare(objName) > 0) {
			foreignObjectName = this.constructor.prefix + "_" + thisName + "_" + objName + "_" + key;
		}

		let connectionClass = null;
		if(window[foreignObjectName]) {
			connectionClass = window[foreignObjectName];
		}else {
			/**
			 * Build automatic field data
			 */
			const fieldData = {
				"id": {
					"type": "Int",
					"db": {
						"primary": true,
						"autoincrement": true
					}
				}
			};
			/**
			"type": "Object",
			"object": "User",
			"array": true
			*/
			fieldData[objName + "Id"] = {
				"type": "Int",
				"db": {}
			};
			fieldData[objName + "Id"]["db"]["foreign"] = obj.constructor;
			fieldData[thisName + "Id"] = {
				"type": "Int",
				"db": {}
			};
			fieldData[thisName + "Id"]["db"]["foreign"] = this.constructor;

			window[foreignObjectName] = class extends PathQLServerEntry {
				static fields = fieldData;

				constructor(options = {}, db) {
					super(options, db);
					return (async function () {
						this.table = foreignObjectName
						await this.parseFromRaw();
						return this;
					}.bind(this)());
				}
			}
			window[foreignObjectName].table = foreignObjectName;
			connectionClass = window[foreignObjectName];
		}

		const cacheConnectionObj = await new connectionClass({}, this.db);
		await cacheConnectionObj.init();
		this.cObj[key] = cacheConnectionObj;
	}

	/**
	 * simple wrapper to create all connection objects automaticly
	 */
	async createAllConnectionObjects() {
		for(const key of this.objectColumnsArray) {
			await this.createConnectionObject(key);
		}
	}

	/**
	 * simple wrapper to save all connection objects
	 */
	async saveAllConnectionObjects() {
		let checkConnection = true;
		for(const key of this.objectColumnsArray) {
			if(this[key] != null) {
				const field = this.constructor.fields[key];
				const object = this.cObj[key];
				if(field.array) {
					for(const connectionId in this[key]) {
						const connection = this[key][connectionId];
						checkConnection = await object.connect(connection, this);
					}
				}else {
					checkConnection = await object.connect(this[key], this);
				}
			}
		}
		return checkConnection;
	}

	/**
	 * load all objects from the foreign table by id of instance
	 */
	async loadObjectsFromForeignTables() {
		await this.createAllConnectionObjects();
		for(const key of this.objectColumnsArray) {
			const field = this.constructor.fields[key];
			if(!this.objects[field.object]) {
				throw new PathQLTypeError({msg: "object is not given in model please check your static objects field"});
			}
			const foreignObject = await new this.objects[field.object]();
			const object = this.cObj[key];
			this[key] = await object.getConnections(foreignObject, this);
			if(!field.array) {
				this[key] = this[key][0];
			}
		}
	}


	/**
	 * Other database methods
	 */
	/**
	 * Search by different parameters + pagination
	 */
	async search(data, request) {
		// check permission
		let statement = `SELECT id FROM ` + this.table;
		let searchStatement = "";
		let whereStatement = " WHERE ";
		let isWhere = false;
		const searchData = [];
		const whereData = [];

		await this.createAllConnectionObjects();

		if(data) {
			for(const key in data) {
				if(key == "data") {
					continue;
				}
				const field = this.constructor.fields[key];

				if(Search[key.toUpperCase()]) {
					searchStatement = searchStatement + " " + Search[key.toUpperCase()];
					searchData.push(data[key]);
				}else if(field && data[key].type && Where[data[key].type.toUpperCase()] && data[key].values && field.type.toUpperCase() != "OBJECT") {
					isWhere = true;
					whereStatement = whereStatement + key + " " + Where[data[key].type.toUpperCase()] + " AND ";
					for(const value of data[key].values) {
						this.validate(value, Types[field.type.toUpperCase()], key);
						whereData.push(value);
					}
				}else if(this.cObj[key] && data[key].type && Where[data[key].type.toUpperCase()] && data[key].values) {
					isWhere = true;
					whereStatement = whereStatement + "id IN (SELECT " + this.constructor.name + "Id FROM " + this.cObj[key].table + " WHERE " + field.object + "Id " + Where[data[key].type.toUpperCase()] + ") AND ";
					for(const value of data[key].values) {
						this.validate(value, Types.INT, key);
						whereData.push(value);
					}
					console.log(whereStatement);
				}
			}
			whereStatement = whereStatement.slice(0, -5);
			if(!isWhere) {
				whereStatement = "";
			}
			statement = statement + whereStatement + searchStatement + ";";
			const result = await this.db.runPrepared(statement, whereData.concat(searchData));

			const newRequest = {
				"data": data.data,
				"settings": request.settings
			};
			const resultData = [];
			let allPerm = false;
			if(this.checkPermission(this.constructor.name + ".search.*", request.settings.connection.permissions)) {
				allPerm = true;
			}
			for(const id of result.result) {
				if(allPerm || this.checkPermission(this.constructor.name + ".search." + id, request.settings.connection.permissions)) {
					const obj = await new this.constructor({}, this.db);
					newRequest.data.id = id[0];
					const jsonData = await obj.parseRequest(newRequest);
					resultData.push(jsonData);
				}
			}
			return resultData;
		}
	}

	/**
	 * count all elements by by different parameters
	 */
	async count(data, _request) {
		// check permission
		let statement = `SELECT COUNT(id) FROM ` + this.table;
		let whereStatement = " WHERE ";
		let isWhere = false;
		const whereData = [];

		if(data) {
			for(const key in data) {
				if(key == "data") {
					continue;
				}
				if(this.constructor.fields[key] != null && data[key].type != null && Where[data[key].type.toUpperCase()] != null && data[key].values != null) {
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

	/**
		* Client method to add an object like a user to another object like an group
		*/
	async addObj(data, _request) {
		await this.load();
		await this.createAllConnectionObjects();
		if(data.name != null && data.id != null && this.cObj[data.name] != null) {
			for(const connection of this.connections) {
				if(connection.name == data.name) {
					const cacheObj = await new connection({id: data.id}, this.db);
					await cacheObj.load();
					await this.cObj[data.name].connect(this, cacheObj);
					return true;
				}
			}
		}
		return false;
	}

	/**
		* Client method to remove a connection between objects
		*/
	async rmObj(data, _request) {
		await this.load();
		await this.createAllConnectionObjects();
		if(data.name != null && data.id != null && this.cObj[data.name] != null) {
			for(const connection of this.connections) {
				if(connection.name == data.name) {
					const cacheObj = await new connection({id: data.id}, this.db);
					await cacheObj.load();
					await this.cObj[data.name].removeConnection(cacheObj);
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * PathQL
	 */
	/**
	 * Parse a json request
	 */
	async parseRequest(request) {
		// Request store connection?
		this.request = request;
		let data = {};
		const fields = {};
		for(const key in this.request.data) {
			// TODO: Check user permission
			if(!this.checkPermission(this.constructor.name + "."  + key, request.settings.connection.permissions)) {
				continue;
			}
			if(this.constructor.fields[key]) {
				if(this.request.data[key]) {
					this[key] = this.request.data[key];
				}
				fields[key] = this.request.data[key];
			}else {
				if(this.constructor.methods[key]) {
					data[key] = await this[key](this.request.data[key], this.request);
				}
			}
		}

		const parseId = parseInt(this.request.data.id) ? parseInt(this.request.data.id) : this.id;
		if(parseId || parseId === 0) {
			const jsonData = await this.getFieldJSON(fields, request);
			data = {
				...data,
				...jsonData
			}
		}
		return data;
	}

	/**
	 * Get object as JSON
	 */
	async getFieldJSON(fields, request) {
		if(!await this.load(true)) {
			throw new PathQLNotExistsError({msg: "object " + this.constructor.name + " not found"});
		}

		const data = {};
		for(const key in fields) {
			// Check permission ?
			const value = this.constructor.fields[key];
			if(value.type.toUpperCase() == "OBJECT") {
				if(!fields[key]) {
					fields[key] = {};
				}
				if(!fields[key].data) {
					fields[key].data = fields[key];
				}
				fields[key].settings = request.settings;
				if(value.array) {
					data[key] = [];
					for(const id in this[key]) {
						data[key].push(await this[key][id].parseRequest(fields[key]));
					}
				}else {
					data[key] = await this[key].parseRequest(fields[key]);
				}
			}else {
				data[key] = this[key];
			}
		}
		return data;
	}

	/**
		* Check permission default method
		*/
	checkPermission(checkPerm, permissions) {
		const splitPerm = checkPerm.split(".");
		if(permissions.includes("*") || permissions.includes(checkPerm)) {
			return true;
		}
		let perm = "";
		for(const permission of splitPerm) {
			perm = perm + permission + ".";
			if(permissions.includes(perm + "*")) {
				return true;
			}
		}
		return false;
	}

	// handle permission by <table>.<field[...]>.<crud_method> + SQL search
	// for example <students>.<teacher.name>.<update> + teacher.id IN [1]
	checkPermission1(checkPermission = {permission: "", search: ""}, _permissions) {
		const splitPermission = checkPermission.permission.split(".");
		const _crud = splitPermission[splitPermission.length];
		const _entry = splitPermission[0];
		const _field = splitPermission.slice(1, splitPermission.length);
	}
}
