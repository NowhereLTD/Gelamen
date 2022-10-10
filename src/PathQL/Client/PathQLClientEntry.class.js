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
		this.name = options.name ? options.name : this.constructor.name;
		for(const method in this.constructor.methods) {
			this[method] = async (data) => {
				const request = {
					pathql: {}
				}
				request.pathql[options.name] = this.getFieldNames();
				request.pathql[options.name][method] = data;
				const response = await this.send(request);
				const newResponse = {};
				newResponse.obj = this.parseEntity(response);
				newResponse[method] = [];
				for(const data of response[method]) {
					newResponse[method].push(this.parseEntity(data));
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
	parseEntity(data) {
		const obj = await this.constructor({client: this.client, name: this.name}, this.debug);
			for(const key of obj.constructor.fields) {
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