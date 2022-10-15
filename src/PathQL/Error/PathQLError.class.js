export class PathQLError extends Error {
	constructor(json) {
		super(json.msg);
		this.msg = json.msg;
	}

	toJSON() {
		return {
			msg: this.msg,
			type: this.constructor.name
		}
	}
}
