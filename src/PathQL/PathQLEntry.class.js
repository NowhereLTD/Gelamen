import {PathQLTypeError} from "pathql/src/PathQL/PathQLTypeError.class.js";
import {PathQLNotExistsError} from "pathql/src/PathQL/PathQLNotExistsError.class.js";
import {PathQLAlredyExistsError} from "pathql/src/PathQL/PathQLAlredyExistsError.class.js";
import Types from "pathql/etc/data/types.json" assert {type: "json"};

/**
 * Init: Parse from raw, sync from database
 * Save: Parse to raw, sync to database
 */
export class PathQLEntry {

  static fields = {};
  static objects = {};
  static prefix = "pql";
  static search = {
    START: "OFFSET ?",
    LIMIT: "LIMIT ?",
    ORDER: "ORDER BY ?"
  }

  static where = {
    EQUAL: "= ?",
    GREATER: "> ?",
    LESS: "< ?",
    GREATEREQUAL: ">= ?",
    LESSEQUAL: "<= ?",
    BETWEEN: "BETWEEN ? AND ?",
    LIKE: "LIKE ?",
    IN: "IN ?",
  }

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

    for(let key in this.constructor.fields) {
      if(this.options[key]) {
        if(this.options[key].value) {
          this[key] = this.options[key].value;
        }else {
          this[key] = this.options[key];
        }
      }
    }
  }

  /**
   * Method to parse all fields from raw fields
   */
  async parseFromRaw(refresh = false) {
    for(let key in this.constructor.fields) {
      if(this["raw" + key] && (!this[key] || refresh)) {
        let value = this.constructor.fields[key];
        if(value.type.toUpperCase() == "OBJECT" && value.object) {
          if(!this.constructor.objects[value.object]) {
            throw new PathQLTypeError({msg: "object is not given in model please check your static objects field"});
          }
          let cacheRaw = JSON.parse(this["raw" + key]);
          if(value.array) {
            this[key] = {};
            for(let objectId of cacheRaw) {
              this.validate(objectId, Types.INT, key);
              this[key][objectId] = await new this.constructor.objects[value.object]({id: objectId}, this.db);
            }
          }else {
            this.validate(cacheRaw, Types.INT, key);
            this[key] = await new this.constructor.objects[value.object]({id: cacheRaw});
          }
        }else {
          this.validate(this["raw" + key], Types[value.type.toUpperCase()], key);
          this[key] = this["raw" + key];
        }
      }
    }
    return true;
  }

  /**
   * Method to parse all fields to raw fields
   */
  async parseToRaw(refresh = true) {
    for(let key in this.constructor.fields) {
      if(this[key] && (!this["raw" + key] || refresh)) {
        let value = this.constructor.fields[key];
        if(value.type.toUpperCase() == "OBJECT") {
          if(value.array) {
            if(this[key].constructor.name != "Array" && this[key].constructor.name != "Object") {
              throw new PathQLTypeError({msg: "element is no array or object", id: this.options[key].id});
            }
            this["raw" + key] = [];
            for(let object of this[key]) {
              let cacheId = object;
              if(this[key].constructor.name == "Object") {
                cacheId = object.id;
              }
              this.validate(cacheId, Types.INT, key);
              this["raw" + key].push(cacheId);
            }
            this["raw" + key] = JSON.stringify(this["raw" + key]);
          }else {
            this.validate(this[key], Types.INT, key);
            this["raw" + key] = this[key];
          }
        }else {
          if(this[key]) {
            this.validate(this[key], Types[value.type.toUpperCase()], key);
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
     for(let key in this.constructor.fields) {
       if(key != "id") {
         this.updateColumns = this.updateColumns + key + " = ?, ";
         this.insertColumns = this.insertColumns + key + ", ";
         this.insertValues = this.insertValues + "?, "
       }
     }
     this.updateColumns = this.updateColumns.slice(0, -2);
     this.insertColumns = this.insertColumns.slice(0, -2);
     this.insertValues = this.insertValues.slice(0, -2);
   }

   /**
    * Generate Database values for save data
    */
   generateDatabaseValues() {
     this.preparedSaveData = [];
     for(let key in this.constructor.fields) {
       let value = this.constructor.fields[key];
       if(key != "id") {
         if(value.type.toUpperCase() == "OBJECT") {
           this.preparedSaveData.push(JSON.stringify(this["raw" + key]));
         }else {
           this.preparedSaveData.push(this["raw" + key]);
         }
       }
     }
   }

   /**
    * Method to load a entry by id
    */
   async load(refresh = false) {
     let statement = `SELECT * FROM ` + this.table + ` WHERE id = ?;`;
     let result = await this.db.runPrepared(statement, [this.id]);
     let i = 0;
     if(result.result && result.result.length > 0) {
       for(let key in this.constructor.fields) {
         let value = this.constructor.fields[key];
         if(result.result[0][i]) {
           if(value.type.toUpperCase() == "OBJECT") {
             this["raw" + key] = JSON.parse(result.result[0][i]);
           }else {
             this["raw" + key] = result.result[0][i];
           }
         }
         i++;
       }
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
     let statement = `SELECT id FROM ` + this.table + ` WHERE id = ?;`;
     let result = await this.db.runPrepared(statement, [this.id]);
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
      if(this.id || !(await this.exists())) {
        statement = `UPDATE ` + this.table + ` SET ` + this.updateColumns + ` WHERE id = ?;`;
        this.preparedSaveData.push(this.id);
      }else {
        statement = `INSERT INTO ` + this.table + ` (` + this.insertColumns + `) VALUES (` + this.insertValues + `);`;
      }

      let result = await this.db.runPrepared(statement, this.preparedSaveData);
      if(result) {
        if(!this.id && result.cursor) {
          this.id = result.cursor;
        }
        return result;
      }else {
        throw new PathQLAlredyExistsError({msg: "object alredy exists!"});
      }
    } catch (e) {
      throw new PathQLAlredyExistsError({msg: "object alredy exists!"});
    }
  }

  /**
   * Delete entry from table
   */
  async delete() {
    await this.createConnections();
    let statement = `DELETE FROM ` + this.table + ` WHERE id = ?;`;
    let result = await this.db.runPrepared(statement, [this.id]);
    for(let connectionObj in this.cObj) {
      this.cObj[connectionObj].removeConnection(this);
    }
    return result;
  }

  /**
   * Init object
   */
  async init() {
    await this.createTable();
    await this.createConnections();
  }

  /**
   * Create table
   */
  async createTable() {
    let preparedCreateData = "";
    for(let key in this.constructor.fields) {
      let value = this.constructor.fields[key];

      if(value.type.toUpperCase() != "OBJECT") {
        preparedCreateData = preparedCreateData + key + " " + Types[value.type.toUpperCase()].database;
      }else {
        // Compability mode creates a string from array
        // TODO: Alternative foreign table
        if(value.array) {
          preparedCreateData = preparedCreateData + key + " " + Types.STRING.database;
        }else {
          preparedCreateData = preparedCreateData + key + " " + Types.INT.database;
        }
      }

      let foreign = null;
      for(let option in value.db) {
        if(value.db[option] && this.db.constructor[option.toUpperCase()]) {
          preparedCreateData = preparedCreateData + " ";
          preparedCreateData = preparedCreateData + this.db.constructor[option.toUpperCase()];
          if(option.toUpperCase() == "FOREIGN") {
            let cacheObj = new value.db[option]({}, this.db);
            foreign = cacheObj.table + "(id)";
          }
        }
      }

      preparedCreateData = preparedCreateData + ", ";
      if(foreign != null) {
        preparedCreateData = preparedCreateData + "FOREIGN KEY (" + key + ") REFERENCES " + foreign;
      }
    }
    preparedCreateData = preparedCreateData.slice(0, -2);

    let statement = `CREATE TABLE IF NOT EXISTS ` + this.table + ` (` + preparedCreateData + `);`;
    let result = await this.db.runPrepared(statement, []);
    return result;
  }

  /**
   * Add m to n connections
   */
  async createConnections() {
    for(let object of this.connections) {
      let cacheObj = await new object({}, this.db);
      let name1 = this.constructor.prefix + "_" + this.constructor.name + "_"  + cacheObj.constructor.name;
      let name2 = this.constructor.prefix + "_" + cacheObj.constructor.name + "_"  + this.constructor.name;
      let connectionClass = null;
      if(window[name1]) {
        connectionClass = window[name1];
      }else if(window[name2]) {
        connectionClass = window[name2];
      }else {
        /**
         * Build automatic field data
         */
        let fieldData = {
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
        fieldData[cacheObj.constructor.name + "Id"] = {
          "type": "Int",
          "db": {}
        };
        fieldData[cacheObj.constructor.name + "Id"]["db"]["foreign"] = cacheObj.constructor;
        fieldData[this.constructor.name + "Id"] = {
          "type": "Int",
          "db": {}
        };
        fieldData[this.constructor.name + "Id"]["db"]["foreign"] = this.constructor;

        window[name1] = class extends PathQLEntry {
          static fields = fieldData;

          constructor(options = {}, db) {
            super(options, db);
            return (async function () {
              this.table = name1
              await this.parseFromRaw();
              return this;
            }.bind(this)());
          }
        }
        window[name1].table = name1;
        connectionClass = window[name1];
      }

      let cacheConnectionObj = await new connectionClass({}, this.db);
      await cacheConnectionObj.init();
      this.cObj[cacheObj.constructor.name] = cacheConnectionObj;
    }
  }

  /**
   * Push method only for foreign objects
   */
  async connect(obj1, obj2) {
    let base = await new this.constructor({}, this.db);
    base[obj1.constructor.name + "Id"] = obj1.id;
    base[obj2.constructor.name + "Id"] = obj2.id;
    let statement = `SELECT * FROM ` + base.table + ` WHERE ` + obj1.constructor.name + `Id` + ` = ? AND ` + obj2.constructor.name + `Id` + ` = ?;`;
    let result = await this.db.runPrepared(statement, [obj1.id, obj2.id]);
    if(result.result.length == 0) {
      await base.save();
      return base;
    }
    return null;
  }

  /**
   * disconnect connection between two objects
   */
  async disconnect(obj1, obj2) {
    let statement = `DELETE FROM ` + this.table + ` WHERE ` + obj1.constructor.name + `Id` + ` = ? AND ` + obj2.constructor.name + `Id` + ` = ?;`;
    let result = await this.db.runPrepared(statement, [obj1.id, obj2.id]);
    return result;
  }

  /**
   * Remove connection
   */
  async removeConnection(obj) {
    let statement = `DELETE FROM ` + this.table + ` WHERE ` + obj.constructor.name + `Id` + ` = ?;`;
    let result = await this.db.runPrepared(statement, [obj.id]);
    return result;
  }

  /**
   * get all connections objects
   */
  async getConnections(obj1, obj2) {
    let statement = `SELECT ` + obj1.constructor.name + `Id FROM ` + this.table + ` WHERE ` + obj2.constructor.name + `Id` + ` = ?;`;
    let result = await this.db.runPrepared(statement, [obj2.id]);
    let objectList = [];
    for(let id of result.result) {
      if(id) {
        let cacheObj = await new obj1.constructor({id: id[0]}, this.db);
        await cacheObj.load();
        objectList.push(cacheObj)
      }
    }
    return objectList;
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
    let searchData = [];
    let whereData = [];

    await this.createConnections();

    if(data) {
      for(let key in data) {
        if(key == "data") {
          continue;
        }

        if(this.constructor.search[key.toUpperCase()]) {
          searchStatement = searchStatement + " " + this.constructor.search[key.toUpperCase()];
          searchData.push(data[key]);
        }else if(this.constructor.fields[key] && data[key].type && this.constructor.where[data[key].type.toUpperCase()] && data[key].values) {
          isWhere = true;
          whereStatement = whereStatement + key + " " + this.constructor.where[data[key].type.toUpperCase()] + " AND ";
          for(let value of data[key].values) {
            this.validate(value, Types[this.constructor.fields[key].type.toUpperCase()], key);
            whereData.push(value);
          }
        }else if(this.cObj[key] && data[key].type && this.constructor.where[data[key].type.toUpperCase()] && data[key].values) {
          isWhere = true;
          whereStatement = whereStatement + "id IN (SELECT " + this.constructor.name + "Id FROM " + this.cObj[key].table + " WHERE " + key + "Id " + this.constructor.where[data[key].type.toUpperCase()] + ") AND ";
          for(let value of data[key].values) {
            this.validate(value, Types.INT, key);
            whereData.push(value);
          }
        }
      }
      whereStatement = whereStatement.slice(0, -5);
      if(!isWhere) {
        whereStatement = "";
      }
      statement = statement + whereStatement + searchStatement + ";";
      let result = await this.db.runPrepared(statement, whereData.concat(searchData));

      let newRequest = {
        "data": data.data,
        "settings": request.settings
      };
      let resultData = [];
      let allPerm = false;
      if(this.checkPermission(this.constructor.name + ".search.*", request.settings.connection.permissions)) {
        allPerm = true;
      }
      for(let id of result.result) {
        if(allPerm || this.checkPermission(this.constructor.name + ".search." + id, request.settings.connection.permissions)) {
          let obj = await new this.constructor({}, this.db);
          newRequest.data.id = id[0];
          let jsonData = await obj.parseRequest(newRequest);
          resultData.push(jsonData);
        }
      }
      return resultData;
    }
  }

  /**
   * count all elements by by different parameters
   */
  async count(data, request) {
    // check permission
    let statement = `SELECT COUNT(id) FROM ` + this.table;
    let whereStatement = " WHERE ";
    let isWhere = false;
    let whereData = [];

    if(data) {
      for(let key in data) {
        if(key == "data") {
          continue;
        }
        if(this.constructor.fields[key] != null && data[key].type != null && this.constructor.where[data[key].type.toUpperCase()] != null && data[key].values != null) {
          isWhere = true;
          whereStatement = whereStatement + key + " " + this.constructor.where[data[key].type.toUpperCase()] + " AND ";
          for(let value of data[key].values) {
            whereData.push(value);
          }
        }
      }
      whereStatement = whereStatement.slice(0, -5);
      if(!isWhere) {
        whereStatement = "";
      }
      statement = statement + whereStatement + ";";
      let result = await this.db.runPrepared(statement, whereData);

      return result.result[0][0];
    }
  }

  /**
    * Client method to add an object like a user to another object like an group
    */
  async addObj(data, request) {
    await this.load();
    await this.createConnections();
    if(data.name != null && data.id != null && this.cObj[data.name] != null) {
      for(let connection of this.connections) {
        if(connection.name == data.name) {
          let cacheObj = await new connection({id: data.id}, this.db);
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
  async rmObj(data, request) {
    await this.load();
    await this.createConnections();
    if(data.name != null && data.id != null && this.cObj[data.name] != null) {
      for(let connection of this.connections) {
        if(connection.name == data.name) {
          let cacheObj = await new connection({id: data.id}, this.db);
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
    let fields = {};
    for(let key in this.request.data) {
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

    let parseId = parseInt(this.request.data.id);
    if(parseId || parseId === 0) {
      data.json = await this.getFieldJSON(fields, request);
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

    let data = {};
    for(let key in fields) {
      // Check permission ?
      let value = this.constructor.fields[key];
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
          for(let id in this[key]) {
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
  async checkPermission(checkPerm, permissions) {
    let splitPerm = checkPerm.split(".");
    if(permissions.includes("*") || permissions.includes(checkPerm)) {
      return true;
    }
    let perm = "";
    for(let permission of splitPerm) {
      perm = perm + permission + ".";
      if(permissions.includes(perm + "*")) {
        return true;
      }
    }
    return false;
  }
}
