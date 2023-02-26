import {GelamenServerRequestHandler} from "gelamen/src/Gelamen/Server/GelamenServerRequestHandler.class.js";
import {Example} from "gelamen/tests/Entrys/Example.gelamen.js";
import {Groups} from "gelamen/tests/Entrys/Groups.gelamen.js";
import {User} from "gelamen/tests/Entrys/User.gelamen.js";

export class TestServer extends GelamenServerRequestHandler {

  static objects = {
    "Example": Example,
    "Groups": Groups,
    "User": User
  }

  constructor(options) {
    super(options);
  }
}