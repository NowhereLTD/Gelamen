/**
 * PathQLClientEntry represent a clone of the backend entry and allows the developer to simple create and handle requests
 */
export class PathQLClientEntry {
	static fields = {};

	// pathql
	static methods = {};

	static name = "PathQLClientEntry";

	/**
	 * @param {JSON} options 
	 * @param {Boolean} debug 
	 */
	constructor(options = {}, debug = false) {
		this.debug = debug;
		this.client = options.client ? options.client : {};
		this.internal_name = options.name ? options.name : this.constructor.name;
		this.fields = this.constructor.fields;
		for(const method in this.constructor.methods) {
			this[method] = async (data) => {
				const request = {
					pathql: {}
				}
				request.pathql[this.internal_name] = this.getFieldNames();
				request.pathql[this.internal_name][method] = data;
				const response = await this.send(request);
				const newResponse = {};
				if(response[this.internal_name].error) {
					newResponse.error = response[this.internal_name].error;
				}else {
					newResponse.obj = await this.parseEntity(response[this.internal_name]);
					newResponse[method] = [];
					if(response[this.internal_name][method] != null && typeof(response[this.internal_name][method]) == "object") {
						for(const data of response[this.internal_name][method]) {
							newResponse[method].push(await this.parseEntity(data));
						}
					}else {
						newResponse[method] = response[this.internal_name][method];
					}
				}
				return newResponse;
			}
		}
	}

	/**
	 * Parse an entity from data with token
	 * @param {JSON} data 
	 * @returns 
	 */
	async parseEntity(data) {
		const obj = await new this.client.objects[this.internal_name]({client: this.client, name: this.internal_name}, this.debug);
			for(const key in this.constructor.fields) {
				if(data[key]) {
					obj[key] = data[key];
				}
			}
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
	 * Send a request via client
	 * @param {JSON} json 
	 * @returns 
	 */
	async send(json) {
		return await this.client.send(json);
	}
}