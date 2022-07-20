import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";

export class PathQLTypeError extends PathQLError {
	constructor(json) {
		super(json);
		this.id = json.id;
	}
}
