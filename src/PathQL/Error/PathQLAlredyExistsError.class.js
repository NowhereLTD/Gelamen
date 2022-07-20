import {PathQLError} from "pathql/src/PathQL/Error/PathQLError.class.js";

export class PathQLAlredyExistsError extends PathQLError {
  constructor(json) {
    super(json);
  }
}
