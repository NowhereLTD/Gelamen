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

	constructor(options = {}, debug = false) {
		this.debug = debug;
		this.client = options.client ? options.client : {};
		for(const method in this.constructor.methods) {
			this[method] = (data) => {
				const request = {
					pathql: {}
				}
				request.pathql[this.constructor.name] = {};
				request.pathql[this.constructor.name][method] = data;
				request.pathql[this.constructor.name].data = this.getFieldNames();
			}
		}
	}

	getFieldNames() {
		const fields = {};
		for(const field in this.constructor.fields) {
			fields[field] = "";
		}
		return fields;
	}

	async send(json) {
		return await this.client.send(json);
	}
}