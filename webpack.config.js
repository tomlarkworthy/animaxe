var webpack = require('webpack');
var ignore = new webpack.IgnorePlugin(new RegExp("^(canvas|mongoose|react)$"))

module.exports = {
  entry: {
    animaxe: ['./src/animaxe.ts'],
    example1: './test/example1.ts'
  },
  output: {
    filename: './dist/[name].js'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader'}
    ]
  },
  node: {
    fs: "empty"
  },
  plugins: [ignore]
};
