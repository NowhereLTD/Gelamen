import {PathQLError} from "pathql/src/PathQL/PathQLError.class.js";

export class PathQLNotExistsError extends PathQLError {
  constructor(json) {
    super(json);
  }
}
