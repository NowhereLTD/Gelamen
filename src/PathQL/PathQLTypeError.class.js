import {PathQLError} from "/src/PathQL/PathQLError.class.js";

export class PathQLTypeError extends PathQLError {
  constructor(json) {
    super(json);
    this.id = json.id;
  }
}
