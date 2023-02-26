export class GelamenValidationError extends Error {
	constructor(json) {
		super(json.msg);
		this.msg = json.msg;
	}
}
