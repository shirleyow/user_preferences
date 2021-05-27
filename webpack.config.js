'use strict';

const Webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const buildDirectory = path.join(__dirname, 'build');

module.exports = {
    mode: 'development',
    entry: {
        app: './src/app.js'
    },
    output: {
        filename: 'app.js',
        path: buildDirectory,
    },
    devtool: false,
    devServer: {
        contentBase: buildDirectory,
        port: process.env.PORT || 8080
    },

    stats: {
        colors: true,
        reasons: true
    },

    plugins: [
        new HtmlWebpackPlugin({ template: 'dist/index.html' }),
        new Webpack.EnvironmentPlugin({
            'NEO4J_URI': "bolt://127.0.0.1:7687",
            'NEO4J_DATABASE': "bbc_poc",
            'NEO4J_USER': "neo4j",
            'NEO4J_PASSWORD': "12345",
            'NEO4J_VERSION': ''
        })
    ],

    resolve: {
        extensions: ['.webpack.js', '.web.js', '.js', '.jsx', '', '.css', '.scss']
    },

    module: {
        rules: [
            {
                test: /\.(sass|css|scss)$/i,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|svg|ico|jpe?g|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                    },
                ],
            },
            {
                test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'fonts/'
                        }
                    }
                ]
            }
        ]
    },
};