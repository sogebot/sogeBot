const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = [{
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
        use: [{
          loader: 'cache-loader'
        }, {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
          }
        }]
      },
      {
        test: /\.vue$/,
        use: ['cache-loader', 'vue-loader'],
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
        use: [{
          loader: 'cache-loader'
        }, {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
          }
        }]
      },
      {
        test: /\.vue$/,
        use: ['cache-loader', 'vue-loader'],
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
}];
