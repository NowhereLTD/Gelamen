import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";

export class PathQLNoPermissionError extends PathQLError {
	constructor(json) {
		super(json);
	}
}
