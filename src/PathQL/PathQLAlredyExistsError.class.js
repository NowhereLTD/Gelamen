import {PathQLError} from "pathql/src/PathQL/PathQLError.class.js";

export class PathQLAlredyExistsError extends PathQLError {
  constructor(json) {
    super(json);
  }
}
