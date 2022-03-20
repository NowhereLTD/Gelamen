import {PathQLError} from "/src/PathQL/PathQLError.class.js";

export class PathQLNotExistsError extends PathQLError {
  constructor(json) {
    super(json);
  }
}
