import {PathQLServerRequestHandler} from "pathql/src/PathQL/Server/PathQLServerRequestHandler.class.js";
import {Example} from "pathql/tests/Entrys/Example.pathql.js";
import {Groups} from "pathql/tests/Entrys/Groups.pathql.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class TestServer extends PathQLServerRequestHandler {

  static objects = {
    "Example": Example,
    "Groups": Groups,
    "User": User
  }

  constructor(options) {
    super(options);
  }
}