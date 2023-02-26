import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenNotExistsError extends GelamenError {
	constructor(json) {
		super(json);
	}
}
