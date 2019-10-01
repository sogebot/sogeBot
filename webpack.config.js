const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const optimization = {
  minimize: process.env.NODE_ENV === 'production',
  moduleIds: 'hashed',
  chunkIds: 'named',
  usedExports: true,
  runtimeChunk: true,
  splitChunks: {
    chunks: 'all',
    minSize: 30000,
    maxSize: 200000,
    minChunks: 1,
    maxAsyncRequests: 5,
    maxInitialRequests: 3,
    automaticNameDelimiter: '~',
    automaticNameMaxLength: 30,
    name: true,
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true
      }
    }
  }
};

module.exports = [{
  watchOptions: {
    ignored: /node_modules/
  },
  mode: process.env.NODE_ENV,
  performance: { hints: false },
  optimization,
  entry: {
    indeX: './src/panel/index.ts',
    overlay: './src/overlay/index.ts',
    login: './src/login/index.ts'
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      src: path.resolve(__dirname, 'src'),
    }
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist', 'js'),
    filename: '[name].js',
    chunkFilename: '[name].[hash].js',
    publicPath: '/dist/js/'
  },
  plugins: [
    new VueLoaderPlugin()
    // new CleanWebpackPlugin(['public/dist/js'])
  ],
  module: {
    rules: [
      {
        test: /\.(mp3)$/i,
        use: 'file-loader',
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true, // webpack@1.x
              disable: true, // webpack@2.x and newer
            },
          },
        ],
      },
      {
        test: /\.txt$/i,
        use: 'raw-loader',
      },
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
}];
