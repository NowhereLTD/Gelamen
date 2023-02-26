import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenFieldMissingError extends GelamenError {
	constructor(json) {
		super(json);
	}
}
