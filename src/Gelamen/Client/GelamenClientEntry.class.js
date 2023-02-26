/**
 * GelamenClientEntry represent a clone of the backend entry and allows the developer to simple create and handle requests
 */
export class GelamenClientEntry extends EventTarget {
	static fields = {};

	// gelamen
	static methods = {};

	static name = "GelamenClientEntry";

	/**
	 * @param {JSON} options 
	 * @param {Boolean} debug 
	 */
	constructor(options = {}) {
		super();
		this.debug = options.debug ? options.debug : 0;
		this.logHistory = [];
		this.client = options.client ? options.client : {};
		this.internal_name = options.name ? options.name : this.constructor.name;
		this.fields = this.constructor.fields;
		this.options = options;
		this.data = {};
		this.error = null;
		for(const method in this.constructor.methods) {
			this[method] = async (data = {}) => {
				this.error = null;
				this.log(`{${this.internal_name}} run method ${method}`);
				const request = {
					gelamen: {}
				};
				request.gelamen[this.internal_name] = await this.getString();
				request.gelamen[this.internal_name][method] = data;
				this.log(`send request: ${JSON.stringify(request)}`);
				const response = await this.send(request);
				this.log(`get server answer: ${JSON.stringify(response)}`);
				const newResponse = {};
				if(response[this.internal_name].error) {
					newResponse.error = response[this.internal_name].error;
				} else if(response[this.internal_name][method][0]) {
					await this.parseEntity(response[this.internal_name][method][0], this);
					newResponse[method] = [];
					if(response[this.internal_name][method] != null && typeof(response[this.internal_name][method]) == "object") {
						// Fix this implement a method to parse nested object structures
						for(const cacheData of response[this.internal_name][method]) {
							newResponse[method].push(await this.parseEntity(cacheData));
						}
					} else {
						this.log("set single entity");
						newResponse[method] = response[this.internal_name][method];
					}
				} else if(typeof(response[this.internal_name][method]) == "object") {
					await this.parseEntity(response[this.internal_name][method], this);
				} else {
					newResponse[method] = response[this.internal_name][method];
					newResponse.error = "No entry found!";
				}
				this.log(newResponse[method])
				this.data[method] = newResponse[method];
				this.error = newResponse.error;
				return this;
			}
		}

		this.addEventListener("updateKey", function(e) {
			this[e.detail.key] = this[e.detail.value];
		}.bind(this));
	}

	/**
	 * Parse an entity from data with token
	 * @param {JSON} data 
	 * @returns 
	 */
	async parseEntity(data, obj, objName = this.internal_name) {
		this.log("Parse new entity");
		this.log(data);
		if(!obj) {
			obj = await new this.client.objects[objName]({client: this.client, name: objName});
		}
		/*if(data.token != null) {
			if(this.client.objectCache[data.token] != null) {
				obj = this.client.objectCache[data.token];
			}else {
				this.client.objectCache[data.token] = obj;
			}
		}*/

		for(const key in this.constructor.fields) {
			const field = this.constructor.fields[key];
			if(data[key]) {
				if(field.type === "Object" && typeof(data[key]) === "object" && this.client.objects[field.object]) {
					const cacheObj = new this.client.objects[field.object](this.options);
					if(data[key].length > 1) {
						obj[key] = [];
						for(const token of data[key]) {
							obj[key].push(await cacheObj.parseEntity({token: token}));
						}
					} else {
						obj[key] = await cacheObj.parseEntity({token: data[key][0]});
					}
				} else if(field.type == "Boolean") {
					obj[key] = JSON.parse(data[key]);
				} else {
					obj[key] = data[key];
				}
			}
		}
		this.log(obj)
		return obj;
	}

	/**
	 * Get a list with all fields as json
	 * @returns 
	 */
	getFieldNames() {
		const fields = {};
		for(const field in this.constructor.fields) {
			fields[field] = this[field] != null ? this[field] : "";
		}
		return fields;
	}

	/**
	 * Get object to string
	 * @returns 
	 */
	async getString(isNested = false) {
		const fields = {};
		for(const field in this.constructor.fields) {
			const fieldEl = this.constructor.fields[field];
			if(fieldEl.type == "Object" && !isNested) {
				try {
					if(this[field]) {
						fields[field] = await this[field].getString();
					} else {
						const cacheObj = await new this.client.objects[fieldEl.object]({client: this.client, name: fieldEl.object});
						fields[field] = await cacheObj.getString(true);
					}
				} catch(e) {
					this.log(e);
				}
			} else {
				fields[field] = this[field] != null ? this[field] : "";
			}
		}
		return fields;
	}

	/**
	 * Send a request via client
	 * @param {JSON} json 
	 * @returns 
	 */
	async send(json) {
		return await this.client.send(json);
	}

	/**
	 * This method would be log an message if the level argument is lesser than the debug level of the object
	 * @param {string} msg 
	 * @param {number} level 
	 */
	log(msg = "", level = 3) {
		if(this.debug > level) {
			console.log("[PATHQL] ", msg);
			this.logHistory.push(msg);
		}
		// push all messages in general to history would be use to much memory over the time for one object
	}
}