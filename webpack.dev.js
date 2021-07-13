"use strict";

const { merge } = require("webpack-merge");


// Common webpack configuration / utilities
const common = require("./webpack.common.js");

// We are building for development
const type = common.DEVELOPMENT;

module.exports = merge(common.getCommonConfiguration(type), {
    mode: type,
    target: "node",
    devtool: "inline-source-map",
    plugins: []
});