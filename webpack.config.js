const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const bundleAnalyze = !!process.env.BUNDLE

const optimization = {
  minimize: process.env.NODE_ENV === 'production',
  moduleIds: 'hashed',
  chunkIds: 'named',
  usedExports: true,
  splitChunks: {
    chunks: 'async',
    minSize: 30000,
    maxSize: 0,
    minChunks: 1,
    maxAsyncRequests: Infinity,
    maxInitialRequests: Infinity,
    automaticNameDelimiter: '~',
    automaticNameMaxLength: 30,
    name: true,
    cacheGroups: {
      fortAwesomeVendor: {
        test: /[\\/]node_modules[\\/]\@fortawesome[\\/]/,
        name: "fasvendor",
        chunks: "initial",
      },
      lodashVendor: {
        test: /[\\/]node_modules[\\/](lodash|lodash-es)[\\/]/,
        name: "lodashvendor",
        chunks: "initial",
      },
      bootstrapVendor: {
        test: /[\\/]node_modules[\\/](bootstrap|bootstrap-vue)[\\/]/,
        name: "bootstrapvendor",
        chunks: "initial",
      },
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        chunks: "initial",
        priority: -30,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true
      }
    }
  }
};

if (process.env.NODE_ENV === 'production') {
  optimization.minimizer = [new TerserPlugin({
    parallel: true,
    terserOptions: {
      ecma: 6,
    },
  })]
}

const webpackConfig = {
  watchOptions: {
    ignored: /node_modules/
  },
  mode: process.env.NODE_ENV,
  performance: { hints: false },
  optimization,
  entry: {
    main: './src/panel/index.ts',
    overlay: './src/overlay/index.ts',
    login: './src/login/index.ts',
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
    filename: '[name].[hash].js',
    chunkFilename: '[name].[hash].js',
    publicPath: '/dist/js/'
  },
  plugins: [
    new VueLoaderPlugin(),
    new CleanWebpackPlugin(),
    new CopyPlugin([ /* TODO: remove in future */
      { from: 'dist/js/commons.js', to: 'commons.js' },
      { from: 'dist/js/components.js', to: 'components.js' }
    ]),
    new HtmlWebpackPlugin({
      filename: '../../popout.html', template: 'src/panel/popout.html', chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      filename: '../../index.html', template: 'src/panel/index.html', chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      filename: '../../overlays.html', template: 'src/overlay/index.html', chunks: ['overlay']
    }),
    new HtmlWebpackPlugin({
      filename: '../../login.html', template: 'src/login/index.html', chunks: ['login']
    })
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
}

if (process.env.NODE_ENV === 'development') {
  webpackConfig.devtool = 'source-map';
}

if (bundleAnalyze) {
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
  webpackConfig.plugins.push(new BundleAnalyzerPlugin())
}

module.exports = webpackConfig;
