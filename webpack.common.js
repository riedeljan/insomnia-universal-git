"use strict";

const path = require("path");
const webpack = require("webpack");

const WebpackNodeExternals = require("webpack-node-externals");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");


// Common webpack configuration / utilities
const projectConstants = require("./webpack.constants.js");


// Global constants
const MODE_PRODUCTION = "production";
const MODE_DEVELOPMENT = "development";


module.exports = {

    // Global constants
    PRODUCTION: MODE_PRODUCTION,
    DEVELOPMENT: MODE_DEVELOPMENT,

    // Common webpack configuration
    getCommonConfiguration: (type) => {

        const outputSuffix = "";

        return {
            target: "node",
            entry: {
                index: "./src/index.tsx"
            },
            output: {
                path: path.join(__dirname, `${projectConstants.outputRoot}`),
                filename: `[name].${outputSuffix && (outputSuffix !== "") ? outputSuffix + "." : ""}js`,
                library: {
                    type: "commonjs"
                }
            },
            resolve: {
                extensions: [".tsx", ".ts", ".js"],
                modules: [
                    "node_modules"
                ]
            },
            module: {
                rules: [
                    { test: /\.tsx$/i, loader: "ts-loader" },
                    { test: /\.ts$/i, loader: "ts-loader" }
                ]
            },
            externals: [WebpackNodeExternals({
                allowlist: []
            })],
            plugins: [
                new CleanWebpackPlugin({
                    dry: false,
                    verbose: true,
                    cleanOnceBeforeBuildPatterns: projectConstants.outputPaths.map((value, index, array) => path.join(process.cwd(), `${value}`))
                }),

                new webpack.DefinePlugin({
                    DEVELOPMENT: JSON.stringify(type === MODE_DEVELOPMENT),
                    "process.env.NODE_ENV": JSON.stringify(type)
                })
            ]
        };
    }
};