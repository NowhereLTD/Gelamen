import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";

export class PathQLNotExistsError extends PathQLError {
	constructor(json) {
		super(json);
	}
}
