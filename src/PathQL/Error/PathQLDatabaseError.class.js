import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";

export class PathQLDatabaseError extends PathQLError {
	constructor(json) {
		super(json);
	}
}
