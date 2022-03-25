const path = require('path')
const PugPlugin = require('pug-plugin')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin')

const isDev = process.env.NODE_ENV !== 'production'

module.exports = {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'inline-source-map' : 'source-map',
    entry: {
        'js/main': path.resolve(__dirname, 'src/assets/js/main.js'),
        'css/main': path.resolve(__dirname, 'src/assets/scss/index.scss'),
    },
    output: {
        filename: '[name].[contenthash:5].js',
        path: path.resolve(__dirname, 'src/_includes/assets'),
        publicPath: 'assets/',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /src\/assets\/js/,
                loader: 'babel-loader',
            },
            {
                test: /\.scss$/i,
                include: /src\/assets\/scss/,
                use: [
                    {
                        loader: 'css-loader',
                        options: {
                            url: false,
                        },
                    },
                    'postcss-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    plugins: [
        new WebpackManifestPlugin(),
        new PugPlugin({
            modules: [
                PugPlugin.extractCss({
                    filename: '[name].[contenthash:5].css',
                }),
            ],
        }),
    ],
}
