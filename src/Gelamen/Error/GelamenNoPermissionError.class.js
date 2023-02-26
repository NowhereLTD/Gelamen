import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenNoPermissionError extends GelamenError {
	constructor(json) {
		super(json);
	}
}
