export class PathQLValidationError extends Error {
	constructor(json) {
		super(json.msg);
		this.msg = json.msg;
	}
}
