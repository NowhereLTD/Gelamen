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

	constructor(options = {}, debug = false) {
		return (async function () {
			this.debug = debug;
			this.client = options.client ? options.client : {};

			const requestData = await this.send({
				getObject: this.constructor.name
			});
			const data = requestData[this.constructor.name];
			const entry = new class extends PathQLClientEntry {
				static fields = data.fields;
				static methods = data.methods;
			};
			entry.objects = data.objects;
			return entry;
		}.bind(this)());
	}

	getEntryByData(json) {
		const entry = new class extends PathQLClientEntry {
			static fields = json.fields;
			static objects = json.objects;
			static methods = json.methods;
		}
		return entry;
	}

	async send(json) {
		return await this.client.send(json);
	}
}