npm install babel-register babel-preset-env --save-dev

Create a starter.js 
require("babel-register")({
  presets: ["env"],
});

// Import the rest of our application.
module.exports = require("./test.js");

App.js 
có cái import
import regeneratorRuntime from "regenerator-runtime";

chạy test
node starters.js

is_encript
