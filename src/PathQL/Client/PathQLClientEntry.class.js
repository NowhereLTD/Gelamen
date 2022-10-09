/**
 * PathQLClientEntry represent a clone of the backend entry and allows the developer to simple create and handle requests
 */
export class PathQLClientEntry {
	static fields = {};

	// pathql
	static methods = {
		"search": {},
		"count": {},
		"addObj": {},
		"rmObj": {}
	};

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
				request.pathql[options.name] = {};
				request.pathql[options.name][method] = data;
				const response = await this.send(request);
				return response;
			}
		}
	}

	/**
	 * Get a list with all fields as json
	 * @returns 
	 */
	getFieldNames() {
		const fields = {};
		for(const field in this.constructor.fields) {
			fields[field] = "";
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