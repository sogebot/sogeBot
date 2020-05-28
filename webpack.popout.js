const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const bundleAnalyze = !!process.env.BUNDLE

const optimization = {
  minimize: process.env.NODE_ENV === 'production',
};

if (process.env.NODE_ENV === 'production') {
  optimization.minimizer = [new TerserPlugin()]
}

const webpackConfig = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [ __filename ] // you may omit this when your CLI automatically adds it
    }
  },
  watchOptions: {
    ignored: ['/node_modules/*'],
  },
  mode: process.env.NODE_ENV,
  performance: { hints: false },
  optimization,
  entry: {
    popout: './src/panel/popout.ts',
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      src: path.resolve(__dirname, 'src'),
      'vm': 'vm-browserify',
      'util': 'util',
    }
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist', 'js'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js',
    publicPath: '/dist/js/',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD': JSON.stringify('web'), // we need this until https://github.com/vuelidate/vuelidate/issues/365 is fixed
      'process.env.NODE_DEBUG': process.env.NODE_DEBUG, // 'util' need it
    }),
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      filename: '../../popout.html', template: 'src/panel/popout.html', chunks: ['popout']
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
