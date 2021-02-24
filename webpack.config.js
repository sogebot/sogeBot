const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const bundleAnalyze = !!process.env.BUNDLE

const optimization = {
  minimize: process.env.NODE_ENV === 'production',
};

if (process.env.NODE_ENV === 'production') {
  optimization.minimizer = [new TerserPlugin()];
}
const webpackConfig = {
  infrastructureLogging: {
    level: 'verbose'
  },
  cache: {
    version: process.env.VERSION,
    type: 'filesystem',
    store: 'pack',
    name: 'AppBuildCache',
    buildDependencies: {
      config: [ __filename ] // you may omit this when your CLI automatically adds it
    }
  },
  watch: process.env.NODE_ENV === 'watch',
  watchOptions: {
    ignored: ['/node_modules/*'],
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  performance: { hints: process.env.NODE_ENV === 'production' ? false : 'warning' },
  optimization,
  entry: {
    main: './src/panel/index.ts',
    popout: './src/panel/popout.ts',
    overlay: './src/overlay/index.ts',
    login: './src/login/index.ts',
    public: './src/public/index.ts',
    spotify: './src/oauth/spotify.ts',
  },
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
    },
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      src: path.resolve(__dirname, 'src'),
      'vm': 'vm-browserify',
      'util': 'util'
    }
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist', 'js'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js',
    publicPath: '/dist/js/',
    pathinfo: false,
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.BUILD': JSON.stringify('web'), // we need this until https://github.com/vuelidate/vuelidate/issues/365 is fixed
      'process.env.NODE_DEBUG': process.env.NODE_DEBUG, // 'util' need it
      'process.env.IS_DEV': process.env.NODE_ENV === 'development',
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: '../../popout.html', template: 'src/panel/popout.html', chunks: ['popout']
    }),
    new HtmlWebpackPlugin({
      filename: '../../index.html', template: 'src/panel/index.html', chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      filename: '../../public.html', template: 'src/public/index.html', chunks: ['public']
    }),
    new HtmlWebpackPlugin({
      filename: '../../overlays.html', template: 'src/overlay/index.html', chunks: ['overlay']
    }),
    new HtmlWebpackPlugin({
      filename: '../../login.html', template: 'src/login/index.html', chunks: ['login']
    }),
    new HtmlWebpackPlugin({
      filename: '../../oauth.html', template: 'src/oauth/index.html', chunks: []
    }),
    new HtmlWebpackPlugin({
      filename: '../../oauth-spotify.html', template: 'src/oauth/spotify.html', chunks: ['spotify']
    }),
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
        use: [{
          loader: 'ts-loader',
          options: {
            experimentalFileCaching: true,
            appendTsSuffixTo: [/\.vue$/],
            configFile: path.resolve('./tsconfig.json'),
          }
        }]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.pug$/,
        oneOf: [
          // this applies to `<template lang="pug">` in Vue components
          {
            resourceQuery: /^\?vue/,
            use: ['pug-plain-loader']
          },
          // this applies to pug imports inside JavaScript
          {
            use: ['raw-loader', 'pug-plain-loader']
          }
        ]
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
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
