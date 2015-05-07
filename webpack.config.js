var webpack = require('webpack');

module.exports = {
  entry: {
    normal: "./normal.js",
    dist: "./dist.js"
  },
  output: {
    path: __dirname,
    filename: "[name]-bundle.js"
  },
  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json'
    }
    ],
    noParse: /(lie|pouchdb)\.js$/
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin
  ]
}
