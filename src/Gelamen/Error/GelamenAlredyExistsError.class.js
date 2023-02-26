import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenAlredyExistsError extends GelamenError {
	constructor(json) {
		super(json);
	}
}
