"use strict";

const { merge } = require("webpack-merge");
const TerserPlugin = require("terser-webpack-plugin");


// Common webpack configuration / utilities
const common = require("./webpack.common.js");

// We are building for production
const type = common.PRODUCTION;

module.exports = merge(common.getCommonConfiguration(type), {
    mode: type,
    target: "node",
    devtool: false,
    optimization: {
        minimize: true
    },
    plugins: [
        new TerserPlugin({
            test: /\.js($|\?)/i,
            parallel: true,
            terserOptions: {
                warnings: false,
                toplevel: true,
                compress: {
                    dead_code: true
                }
            }
        })
    ]
});