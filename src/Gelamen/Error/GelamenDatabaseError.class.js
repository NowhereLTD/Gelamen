import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenDatabaseError extends GelamenError {
	constructor(json) {
		super(json);
	}
}
