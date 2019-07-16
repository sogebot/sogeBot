const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = [{
  watchOptions: {
    ignored: /node_modules/
  },
  mode: process.env.NODE_ENV,
  performance: { hints: false },
  entry: './src/panel/index.ts',
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    }
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist', 'js'),
    filename: 'main.js',
    publicPath: '/dist/js/'
  },
  plugins: [
    new VueLoaderPlugin()
    // new CleanWebpackPlugin(['public/dist/js'])
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /(node_modules|bower_components)/,
        use: [{
          loader: 'ts-loader',
          options: {
            experimentalFileCaching: true,
            appendTsSuffixTo: [/\.vue$/],
          }
        }]
      },
      {
        test: /\.vue$/,
        exclude: /(node_modules|bower_components)/,
        use: ['vue-loader'],
      },
      {
        test: /\.css$/,
        oneOf: [
          // this applies to <style module>
          {
            resourceQuery: /module/,
            use: [
              'vue-style-loader',
              {
                loader: 'css-loader',
                options: {
                  modules: true,
                  cacheDirectory: true,
                  localIdentName: '[local]_[hash:base64:8]'
                }
              }
            ]
          },
          // this applies to <style> or <style scoped>
          {
            use: [
              'vue-style-loader',
              'css-loader'
            ]
          }
        ]
      }
    ]
  }
}, {
  watchOptions: {
    ignored: /node_modules/
  },
  mode: process.env.NODE_ENV,
  performance: { hints: false },
  entry: ['./src/overlay/index.ts'],
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    }
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist', 'js'),
    filename: 'overlay.js',
    publicPath: '/dist/js/'
  },
  plugins: [
    new VueLoaderPlugin()
    // new CleanWebpackPlugin(['public/dist/js'])
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /(node_modules|bower_components)/,
        use: [{
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
            experimentalFileCaching: true
          }
        }]
      },
      {
        test: /\.vue$/,
        exclude: /(node_modules|bower_components)/,
        use: ['vue-loader'],
      },
      {
        test: /\.css$/,
        oneOf: [
          // this applies to <style module>
          {
            resourceQuery: /module/,
            use: [
              'vue-style-loader',
              {
                loader: 'css-loader',
                options: {
                  modules: true,
                  localIdentName: '[local]_[hash:base64:8]',
                  cacheDirectory: true
                }
              }
            ]
          },
          // this applies to <style> or <style scoped>
          {
            use: [
              'vue-style-loader',
              'css-loader'
            ]
          }
        ]
      }
    ]
  }
}];
