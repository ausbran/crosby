const path = require('path');

module.exports = {
  mode: 'production',
  entry: './js/main.js',
  output: {
    filename: 'main.min.js',
    chunkFilename: '[name].main.min.js',
    path: path.resolve(__dirname, 'web/assets/js'),
    clean: true,
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
};
