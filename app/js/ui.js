const EventEmitter = require('events').EventEmitter
const async = require('async')
const Dnode = require('dnode')
const Eth = require('ethjs')
const EthQuery = require('eth-query')
const launchMetamaskUi = require('../../ui')
const setupMultiplex = require('./lib/stream-utils.js').setupMultiplex