const path = require('path');

module.exports = {
  mode: 'production',
  entry: './js/main.js',
  output: {
    filename: 'main.min.js',
    path: path.resolve(__dirname, 'web/assets/js'),
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