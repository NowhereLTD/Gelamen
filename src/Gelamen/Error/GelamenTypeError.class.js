import {GelamenError} from "gelamen/src/Gelamen/Error/GelamenError.class.js";

export class GelamenTypeError extends GelamenError {
	constructor(json) {
		super(json);
		this.id = json.id;
	}
}
