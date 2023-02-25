import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";

export class PathQLFieldMissingError extends PathQLError {
	constructor(json) {
		super(json);
	}
}
