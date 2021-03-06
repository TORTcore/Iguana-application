'use strict';

angular.module('IguanaGUIApp')
.controller('dashboardController', [
  '$scope',
  '$state',
  'util',
  '$passPhraseGenerator',
  '$timeout',
  '$interval',
  '$storage',
  '$uibModal',
  '$api',
  'vars',
  '$rootScope',
  '$filter',
  '$rates',
  '$auth',
  '$message',
  '$datetime',
  '$window',
  function($scope, $state, util, $passPhraseGenerator, $timeout, $interval, $storage, $uibModal,
           $api, vars, $rootScope, $filter, $rates, $auth, $message, $datetime) {

    var coinsInfo = [],
        coinBalances = [],
        _sideBarCoins = {},
        coinsSelectedByUser = [],
        isIguana = $storage.isIguana,
        defaultCurrency = $rates.getCurrency() ? $rates.getCurrency().name : null || settings.defaultCurrency,
        defaultAccount = isIguana ? settings.defaultAccountNameIguana : settings.defaultAccountNameCoind;

    $scope.util = util;
    $scope.$state = $state;
    $scope.isIguana = isIguana;
    $rootScope.$state = $state;
    $scope.enabled = $auth.checkSession(true);
    // TODO: merge all dashboard data into a single object for caching
    $scope.currency = defaultCurrency;
    $scope.coinsInfo = vars.coinsInfo;
    $scope.totalBalance = 0;
    $scope.sideBarCoins = [];
    $scope.txUnit = {
      loading: true,
      activeCoinBalance: 0,
      activeCoinBalanceCurrency: 0,
      transactions: []
    };
    $scope.sideBarCoinsUnsorted = {};
    $scope.activeCoin = $storage['iguana-active-coin'] && $storage['iguana-active-coin'].id ? $storage['iguana-active-coin'].id : 0;
    $scope.addCoinButtonState = true;
    $scope.disableRemoveCoin = !dev.isDev || isIguana; // dev
    $rootScope.background = false;
    $scope.$receiveCoinInstance = {};
    $scope.passphrase = '';
    $scope.dev = dev;
    $scope.coinsSelectedToAdd = [];
    $scope.$modalInstance = {};
    $scope.receivedObject = undefined;
    $scope.$sendCoinInstance = {};
    $scope.loggedCoins = $storage['dashboard-logged-in-coins'];
    $storage['dashboard-added-by-user-coins'] = (
      $storage['dashboard-added-by-user-coins'] ? $storage['dashboard-added-by-user-coins'] : []
    );
    $scope.addedByUserCoins = $storage['dashboard-added-by-user-coins'];
    $scope.openAddCoinModal = openAddCoinModal;
    $scope.openReceiveCoinModal = openReceiveCoinModal;
    $scope.openSendCoinModal = openSendCoinModal;
    $scope.setActiveCoin = setActiveCoin;
    $scope.setTxUnitBalance = setTxUnitBalance;
    $scope.removeCoin = removeCoin;
    $scope.getActiveCoins = getActiveCoins;
    $scope.switchLayoutMode = switchLayoutMode;
    $scope.karma = { // tests
      constructAccountCoinRepeater: constructAccountCoinRepeater,
      constructAccountCoinRepeaterCB: constructAccountCoinRepeaterCB,
      removeCoin: removeCoin,
      checkAddCoinButton: checkAddCoinButton,
      updateTotalBalance: updateTotalBalance,
      constructTransactionUnitRepeater: constructTransactionUnitRepeater,
      constructTransactionUnitRepeaterCB: constructTransactionUnitRepeaterCB,
      updateFeeParams: updateFeeParams,
      switchLayoutMode: switchLayoutMode
    };
    $scope.activeSyncInfo = false;
    $scope.coinSyncInfo = {};
    $rootScope.$on('$stateChangeStart', stateChangeStart);

    $scope.showSyncInfo = function(itemId) {
      if (itemId === $scope.activeSyncInfo) {
        $scope.activeSyncInfo = false;
      } else {
        $scope.activeSyncInfo = itemId;
      }
    };

    util.bodyBlurOff();
    delete $storage['dashboard-pending-coins'];
    $rootScope.$on('coinsInfo', onInit);

    if ($scope.coinsInfo) {
      onInit();
    }

    function onInit() {
      coinsInfo = vars.coinsInfo;
      checkAddCoinButton();
      constructAccountCoinRepeater();
      updateFeeParams();
    }

    var modalInstance = {};
    // Modals start
    function openAddCoinModal() {
      $scope.modal.coinModal.resolve = {
        'type': function() {
          return 'signin';
        },
        'modal': function() {
          return $scope.modal;
        }
      };

      modalInstance = $uibModal.open($scope.modal.coinModal);

      modalInstance.result.then(resultPromise);

      function resultPromise(data) {
        $scope.receivedObject = util.getCoinKeys(util.reindexAssocArray($scope.getActiveCoins()));

        var coinKeys = Object.keys($storage['iguana-login-active-coin']);

        $storage['dashboard-pending-coins'] = !!coinKeys;
        $scope.coins = data;
        $scope.passphraseModel = coinKeys.length ? $storage['iguana-login-active-coin'][coinKeys[0]].pass : '';

        modalInstance.closed.then(function() {
          $rootScope.allowLoginStateChange = true;

          if ($storage.isIguana) {
            $auth.coinsSelectedToAdd = $storage['iguana-login-active-coin'];
            $auth
              .checkIguanaCoinsSelection(true)
              .then(
                function() {
                  var coinNames = [];

                  for (var name in $auth.coinsSelectedToAdd) {
                    if (!$storage['dashboard-logged-in-coins'][name]) {
                      $storage['dashboard-added-by-user-coins'].push(name);
                      $storage['dashboard-logged-in-coins'][name] = $auth.coinsSelectedToAdd[name];
                      coinNames.push($auth.coinsSelectedToAdd[name].name);
                    }
                  }

                  var message = $message.ngPrepMessageModal(
                    coinNames.join(', ') + (coinNames.length > 1 ? ' are' : ' is') + $filter('lang')('MESSAGE.WALLET_IS_CREATED'),
                    'green'
                  );

                  //TODO: not completed
                  $timeout(function () {
                    message.close();
                  }, 2500);

                  constructAccountCoinRepeater();
                },
                function(reason) {
                  if (dev.showConsoleMessages && dev.isDev)
                    console.log('request failed: ' + reason);
                }
              );
          } else {
            $state.go('login.step2');
          }
        });
      }

      $scope.karma.modal = modalInstance; // tests
    }

    function openReceiveCoinModal() {
      $scope.modal.receiveCoinModal.resolve = {
        'modal': function() {
          return $scope.modal;
        }
      };

      modalInstance = $uibModal.open($scope.modal.receiveCoinModal);
    }

    function openSendCoinModal() {
      $scope.modal.sendCoinModal.resolve = {
        'modal': function() {
          return $scope.modal;
        }
      };

      modalInstance = $uibModal.open($scope.modal.sendCoinModal);
    }
    // Modals end

    function setActiveCoin(item) {
      $storage['iguana-active-coin'] = { id: item.id };
      $scope.activeCoin = item.id;
      $scope.setTxUnitBalance(item);
      constructTransactionUnitRepeater();
      updateFeeParams();

      if (util.isMobile() && $state.current.name === 'dashboard.mobileCoins') {
        $state.go('dashboard.mobileTransactions');
      }
    }

    function setTxUnitBalance(item) {
      $scope.txUnit.activeCoinBalance = item ? item.coinValue : $scope.sideBarCoinsUnsorted[$scope.activeCoin].coinValue;
      $scope.txUnit.activeCoinBalanceCurrency = item ? item.currencyValue : $scope.sideBarCoinsUnsorted[$scope.activeCoin].currencyValue;
    }

    function removeCoin(coinId) {
      if (confirm($filter('lang')('DASHBOARD.ARE_YOU_SURE_YOU_WANT') + ' ' + $scope.sideBarCoinsUnsorted[coinId].name) === true) {
        $storage['iguana-' + coinId + '-passphrase'] = { 'logged': 'no' };

        delete $scope.sideBarCoinsUnsorted[coinId];
        $scope.sideBarCoins = Object.keys($scope.sideBarCoinsUnsorted).map(function(key) {
          return $scope.sideBarCoinsUnsorted[key];
        });

        if ($scope.activeCoin === coinId) {
          $scope.setActiveCoin($scope.sideBarCoins[0]);
        }

        checkAddCoinButton();
        updateTotalBalance();
      }
    }

    function getActiveCoins() {
      return $storage['iguana-login-active-coin'];
    }

    function constructAccountCoinRepeater() {
      var index = 0;

      coinsSelectedByUser = [];

      var lookupArray = coinsInfo && coinsInfo.length ? coinsInfo : supportedCoinsList;

      for (var key in lookupArray) {
        if ($storage['iguana-' + key + '-passphrase'] &&
          $storage['iguana-' + key + '-passphrase'].logged === 'yes') {
          coinsSelectedByUser[index] = key;
          index++;
        }
      }

      if (coinsSelectedByUser.length && !$scope.activeCoin) {
        $scope.activeCoin = coinsSelectedByUser[0];
        $storage['iguana-active-coin'] = { id: $scope.activeCoin };
      }

      coinBalances = [];

      for (var i = 0; i < coinsSelectedByUser.length; i++) {
        _sideBarCoins[coinsSelectedByUser[i]] = {
          id: coinsSelectedByUser[i],
          coinIdUc: coinsSelectedByUser[i].toUpperCase(),
          name: supportedCoinsList[coinsSelectedByUser[i]].name,
          loading: true
        };

        $scope.sideBarCoins = Object.keys(_sideBarCoins).map(function(key) {
          return _sideBarCoins[key];
        });

        $api.getBalance(defaultAccount, coinsSelectedByUser[i])
          .then(
            function(response) {
              constructAccountCoinRepeaterCB(response[0], response[1]);
            },
            function(response) {
              if (dev.showConsoleMessages && dev.isDev) {
                console.log('request failed: ', response);
              }
            }
          );

          // TODO: rewrite
          if ($storage.isIguana) {
            $api.getInfo(coinsSelectedByUser[i]).then(
              function(response) {
                var _syncInfo = {};

                if (response[0].data && response[0].data.status) {
                  var iguanaGetInfo = response[0].data.status.split(' '),
                      totalBundles = iguanaGetInfo[20].split(':'),
                      currentHeight = iguanaGetInfo[9].replace('h.', ''),
                      peers = iguanaGetInfo[16].split('/');

                  _syncInfo.peers = peers[0].replace('peers.', '');
                  _syncInfo.blocks = currentHeight;
                  _syncInfo.localBundles = iguanaGetInfo[14].replace('E.', '');
                  _syncInfo.totalBundles = totalBundles[0];
                  _syncInfo.bundlesPercentage = Number(iguanaGetInfo[14].replace('E.', '') * 100 / totalBundles[0]).toFixed(1);
                  _syncInfo.title = 'Bundles: ' + _syncInfo.localBundles + ' / ' + _syncInfo.totalBundles;
                  if (_syncInfo.bundlesPercentage === NaN) _syncInfo.bundlesPercentage = 0;

                  if (dev.showConsoleMessages && dev.isDev) {
                    console.log('Connections: ' + peers[0].replace('peers.', ''));
                  }
                  if (dev.showConsoleMessages && dev.isDev) {
                    console.log('Blocks: ' + currentHeight);
                  }
                  if (dev.showConsoleMessages && dev.isDev) {
                    console.log('Bundles: ' + iguanaGetInfo[14].replace('E.', '') + '/' +
                      totalBundles[0] + ' (' + _syncInfo.bundlesPercentage  + '% synced)');
                  }

                  if (Number(iguanaGetInfo[14].replace('E.', '') * 100 / totalBundles[0]) !== 100) {
                    _syncInfo.loaderBar = true;
                    _syncInfo.loaderBarSize = _syncInfo.bundlesPercentage;
                  } else {
                    _syncInfo.loaderBar = false;
                  }
                  if (response[0].data.status.indexOf('.RT0 ') > -1) {
                    _syncInfo.isRT = false;

                    if (dev.showConsoleMessages && dev.isDev) {
                      console.log('RT is not ready yet!');
                    }
                  } else {
                    _syncInfo.isRT = true;
                    _syncInfo.loaderBar = false;
                  }
                }

                if (_syncInfo.bundlesPercentage > 100) {
                  _syncInfo = {};
                }

                $scope.coinSyncInfo[response[1]] = _syncInfo;
              },
              function(response) {
                if (dev.showConsoleMessages && dev.isDev) {
                  console.log('request failed: ', response);
                }
              }
            );
          } else {
            if (coinsSelectedByUser[i] === 'kmd') {
              $api.getInfo(coinsSelectedByUser[i]).then(
                function(response) {
                  var _syncInfo = {};

                  if (response[0].data.result) {
                    _syncInfo.peers = response[0].data.result.connections;
                    _syncInfo.localBlocks = response[0].data.result.blocks;
                    _syncInfo.totalBlocks = response[0].data.result.longestchain;
                    _syncInfo.blocksPercentage = Number(_syncInfo.localBlocks * 100 / _syncInfo.totalBlocks).toFixed(1);
                    _syncInfo.title = 'Blocks:' + _syncInfo.localBlocks + ' / ' + _syncInfo.totalBlocks;
                    if (_syncInfo.blocksPercentage === NaN) _syncInfo.blocksPercentage = 0;

                    if (_syncInfo.localBlocks !== _syncInfo.totalBlocks) {
                      _syncInfo.isRT = false;

                      if (dev.showConsoleMessages && dev.isDev)
                        console.log('RT is not ready yet!');
                    } else {
                      _syncInfo.isRT = true;
                    }

                    if (Number(_syncInfo.localBlocks * 100 / _syncInfo.totalBlocks) !== 100) {
                      _syncInfo.loaderBar = true;
                      _syncInfo.loaderBarSize = (_syncInfo.localBlocks * 100 / _syncInfo.totalBlocks).toFixed(2);
                    } else {
                      _syncInfo.loaderBar = false;
                    }
                  }

                  if (_syncInfo.blocksPercentage > 100) {
                    _syncInfo = {};
                  }

                  $scope.coinSyncInfo[response[1]] = _syncInfo;
                },
                function(response) {
                  if (dev.showConsoleMessages && dev.isDev) {
                    console.log('request failed: ', response);
                  }
                }
              );
            }
          }
      }
    }

    // construct account coins array
    function constructAccountCoinRepeaterCB(balance, coin) {
      var coinLocalRate = $rates.updateRates(coin.toUpperCase(), defaultCurrency, true) || 0,
          currencyCalculatedValue = balance * coinLocalRate,
          coinBalanceVal = balance || 0,
          coinBalanceCurrencyVal = currencyCalculatedValue || 0,
          activeMode = $scope.loggedCoins[coin].activeMode;

      coinBalances[coin] = balance;

      _sideBarCoins[coin] = {
        id: coin,
        name: supportedCoinsList[coin].name,
        coinBalanceUnformatted: Number(balance),
        coinValue: Number(coinBalanceVal),
        coinIdUc: coin.toUpperCase(),
        currencyValue: Number(coinBalanceCurrencyVal),
        currencyName: defaultCurrency,
        loading: false,
        mode: (
          activeMode === -1 ?
            'Native' : (
              activeMode === 0 ?
                'Lite' :
                'Full'
            )
        )
      };

      $scope.sideBarCoins = Object.keys(_sideBarCoins).map(function(key) {
        return _sideBarCoins[key];
      });
      $scope.sideBarCoinsUnsorted = _sideBarCoins;

      // run balances and tx unit update once left sidebar is updated
      if (Object.keys(coinsSelectedByUser).length === Object.keys(coinBalances).length) {
        updateTotalBalance();
        $scope.setTxUnitBalance();
        constructTransactionUnitRepeater();
      }
    }

    function checkAddCoinButton() {
      // disable add wallet/coin button if all coins/wallets are already in the sidebar
      var _coinsLeftToAdd = 0,
          lookupArray = coinsInfo && coinsInfo.length ? coinsInfo : supportedCoinsList;

      for (var key in lookupArray) {
        if (!$storage['iguana-' + key + '-passphrase'] ||
          $storage['iguana-' + key + '-passphrase'] &&
          $storage['iguana-' + key + '-passphrase'].logged !== 'yes') {
          if ((isIguana && coinsInfo[key] && coinsInfo[key].iguana !== false) ||
              (!isIguana && coinsInfo[key] && coinsInfo[key].connection === true)) {
                _coinsLeftToAdd++;
          }
        }
      }

      $scope.addCoinButtonState = _coinsLeftToAdd > 0;
    }

    function updateTotalBalance() {
      var sidebarCoins = $scope.sideBarCoinsUnsorted,
          _totalBalance = 0;

      for (var key in sidebarCoins) {
        var coinLocalRate = $rates.updateRates(key, defaultCurrency, true) || 0;

        _totalBalance += coinLocalRate * sidebarCoins[key].coinBalanceUnformatted;
      }

      $scope.totalBalance = _totalBalance || 0;
    }

    // construct transaction unit array
    function constructTransactionUnitRepeater(update) {
      if (!update) {
        $scope.txUnit.loading = true;
      }

      if (!$scope.txUnit.transactions) {
        $scope.txUnit.transactions = [];
      }
      // TODO: tx unit flickers on active coin change
      $api.listTransactions(defaultAccount, $scope.activeCoin)
          .then(
            constructTransactionUnitRepeaterCB,
            function(reason) {
              if (dev.showConsoleMessages && dev.isDev)
                console.log('request failed: ' + reason);
            });
    }

    // new tx will appear at the top of the list
    // while old tx are going to be removed from the list
    function constructTransactionUnitRepeaterCB(response) {
      var transactionsList = response,
          decimalPlacesTxUnit = settings.decimalPlacesTxUnit;

      // sort tx in desc order by timestamp
      if (transactionsList) {
        if (transactionsList.length) {
          $scope.txUnit.loading = false;
        }

        for (var i = 0; i < transactionsList.length; i++) {
          if (!$scope.txUnit.transactions[i]) {
            $scope.txUnit.transactions[i] = {};
          }

          if (transactionsList[i].txid) {
            // TODO: add func to evaluate tx time in seconds/minutes/hours/a day from now e.g. 'a moment ago', '1 day ago' etc
            // timestamp is converted to 24h format
            var transactionDetails = transactionsList[i],
                txIncomeOrExpenseFlag = '',
                txStatus = 'N/A',
                txCategory = '',
                txAddress = '',
                txAmount = 'N/A',
                iconSentClass = 'bi_interface-minus',
                iconReceivedClass = 'bi_interface-plus';

            if (transactionDetails) {
              if (transactionDetails.details) {
                txAddress = transactionDetails.details[0].address;
                txAmount = transactionDetails.details[0].amount;
                // non-iguana
                if (transactionDetails.details[0].category)
                  txCategory = transactionDetails.details[0].category;

                if (transactionDetails.details[0].category === 'send') {
                  txIncomeOrExpenseFlag = iconSentClass;
                  txStatus = $filter('lang')('DASHBOARD.SENT');
                } else {
                  txIncomeOrExpenseFlag = iconReceivedClass;
                  txStatus = $filter('lang')('DASHBOARD.RECEIVED');
                }
              } else {
                // iguana
                txAddress = transactionsList[i].address || transactionDetails.address;
                txAmount = transactionsList[i].amount;
                txStatus = transactionDetails.category || transactionsList[i].category;
                txCategory = transactionDetails.category || transactionsList[i].category;

                if (txStatus === 'send') {
                  txIncomeOrExpenseFlag = iconSentClass;
                  txStatus = $filter('lang')('DASHBOARD.SENT');
                } else {
                  txIncomeOrExpenseFlag = iconReceivedClass;
                  txStatus = $filter('lang')('DASHBOARD.RECEIVED');
                }
              }

              if (Number(transactionDetails.confirmations) &&
                  Number(transactionDetails.confirmations) < settings.txUnitProgressStatusMinConf) {
                txStatus = $filter('lang')('DASHBOARD.IN_PROCESS');
                txCategory = 'process';
              }

              if (isIguana && txAmount !== undefined || !isIguana) {
                $scope.txUnit.transactions[i].txId = transactionDetails.txid;
              }

              $scope.txUnit.transactions[i].status = txStatus;
              $scope.txUnit.transactions[i].statusClass = transactionDetails.confirmations ? txCategory : 'process';
              $scope.txUnit.transactions[i].confs = transactionDetails.confirmations ? transactionDetails.confirmations : 'n/a';
              $scope.txUnit.transactions[i].inOut = txIncomeOrExpenseFlag;
              $scope.txUnit.transactions[i].amount = txAmount > 0 ? Math.abs(txAmount.toFixed(decimalPlacesTxUnit)) : Math.abs(txAmount);
              $scope.txUnit.transactions[i].timestampFormat = 'timestamp-multi';
              $scope.txUnit.transactions[i].coin = $scope.activeCoin.toUpperCase();
              $scope.txUnit.transactions[i].hash = txAddress !== undefined ? txAddress : 'N/A';

              if (txAmount) {
                // mobile only
                $scope.txUnit.transactions[i].switchStyle = txAmount.toString().length > 8;
              }

              $scope.txUnit.transactions[i].timestampUnchanged = transactionDetails.blocktime ||
                                                                 transactionDetails.timestamp ||
                                                                 transactionDetails.time;
              $scope.txUnit.transactions[i].timestampDate = $datetime.convertUnixTime(transactionDetails.blocktime ||
                                                                                      transactionDetails.timestamp ||
                                                                                      transactionDetails.time, 'DDMMMYYYY');
              $scope.txUnit.transactions[i].timestampTime = $datetime.convertUnixTime(transactionDetails.blocktime ||
                                                                                      transactionDetails.timestamp ||
                                                                                      transactionDetails.time, 'HHMM');
            }
          }
        }
      } else {
        delete $scope.txUnit.transactions;
      }
    }

    function updateFeeParams() {
      var activeCoin = $storage['iguana-active-coin'] && $storage['iguana-active-coin'].id ? $storage['iguana-active-coin'].id : 0,
          defaultAccount = $scope.isIguana ? settings.defaultAccountNameIguana : settings.defaultAccountNameCoind,
          currencyName = $rates.getCurrency() ? $rates.getCurrency().name : settings.defaultCurrency,
          coinName = activeCoin ? activeCoin.toUpperCase() : '',
          defaultCurrency = $rates.getCurrency() ? $rates.getCurrency().name : null || settings.defaultCurrency;

      if (activeCoin) {
        $storage.feeSettings = {};
        $storage.feeSettings.activeCoin = $storage['iguana-active-coin'] && $storage['iguana-active-coin'].id ? $storage['iguana-active-coin'].id : undefined;

        $api.feeCoins(
          activeCoin,
          defaultAccount,
          currencyName,
          coinName
        ).then(function(result) {
          var coin = result.getBalance[1],
              fastestFee = util.checkFeeCount(result.bitcoinFees.data.fastestFee, $storage.feeSettings.currencyRate),
              halfHourFee = util.checkFeeCount(result.bitcoinFees.data.halfHourFee, $storage.feeSettings.currencyRate),
              hourFee = util.checkFeeCount(result.bitcoinFees.data.hourFee, $storage.feeSettings.currencyRate),
              coinCurrencyRate = result.getExternalRate[0][coinName] ? result.getExternalRate[0][coinName][currencyName] : 0;

          $storage.feeSettings.currencyRate = $rates.updateRates(result.getBalance[1], defaultAccount, true);
          $storage.feeSettings.currency = defaultCurrency;
          $storage.feeSettings.coinName = supportedCoinsList[coin].name;
          $storage.feeSettings.coinId = activeCoin.toUpperCase();
          $storage.feeSettings.coinValue = result.getBalance[0];
          $storage.feeSettings.currencyValue = result.getBalance[0] * $storage.feeSettings.currencyRate;

          $storage.feeSettings.sendCoin = {
            initStep: true,
            success: false,
            address: '',
            amount: '',
            amountCurrency: '',
            fee: '',
            minFee: coinsInfo[activeCoin].relayFee || 0.00001,
            feeCurrency: '',
            note: '',
            passphrase: '',
            valid: {
              address: true,
              amount: {
                empty: false,
                notEnoughMoney: false
              },
              fee: {
                empty: false,
                notEnoughMoney: false
              }
            },
            entryFormIsValid: false
          };

          if ($scope.activeCoin === 'btc') {
            var feeTime = {
              default: {
                min: '',
                max: ''
              },
              low: {
                min: '',
                max: ''
              },
              normal: {
                min: '',
                max: ''
              },
              high: {
                min: '',
                max: ''
              }
            };

            result.bitcoinFeesAll.data.fees.forEach(function(el) {
              if (el.maxFee === 0) {
                feeTime.default = {
                  min: el.minMinutes,
                  max: el.maxMinutes
                };
              }
              if (el.maxFee === result.bitcoinFees.data.fastestFee) {
                feeTime.high = {
                  min: el.minMinutes,
                  max: el.maxMinutes
                };
              }
              if (el.maxFee === result.bitcoinFees.data.halfHourFee) {
                feeTime.normal = {
                  min: el.minMinutes,
                  max: el.maxMinutes
                };
              }
              if (el.maxFee === result.bitcoinFees.data.hourFee) {
                feeTime.low = {
                  min: el.minMinutes,
                  max: el.maxMinutes
                };
              }
            });

            $storage.feeSettings.items = [{
              id: 0,
              name: $filter('lang')('SEND.FEE_MIN'),
              coin: $storage.feeSettings.sendCoin.minFee.toFixed(7),
              amount: (coinCurrencyRate * $storage.feeSettings.sendCoin.minFee).toFixed(12),
              feeMinTime: feeTime.default.min,
              feeMaxTime: feeTime.default.max
            }, {
              id: 1,
              name: $filter('lang')('SEND.FEE_LOW'),
              coin: hourFee.coin.toFixed(7),
              amount: (coinCurrencyRate * hourFee.coin).toFixed(12),
              feeMinTime: feeTime.low.min,
              feeMaxTime: feeTime.low.max
            }, {
              id: 2,
              name: $filter('lang')('SEND.FEE_NORMAL'),
              coin: halfHourFee.coin.toFixed(7),
              amount: (coinCurrencyRate * halfHourFee.coin).toFixed(12),
              feeMinTime: feeTime.normal.min,
              feeMaxTime: feeTime.normal.max
            }, {
              id: 3,
              name: $filter('lang')('SEND.FEE_HIGH'),
              coin: fastestFee.coin.toFixed(7),
              amount: (coinCurrencyRate * fastestFee.coin).toFixed(12),
              feeMinTime: feeTime.high.min,
              feeMaxTime: feeTime.high.max
            }];
          }
        }.bind(this));
      }
    }

    function stateChangeStart() {
      $interval.cancel(vars.dashboardUpdateRef);
    }

    function switchLayoutMode() {
      if (util.isMobile() && $state.current.name === 'dashboard.main' &&
          $state.current.name !== 'dashboard.mobileTransactions') {
        $state.go('dashboard.mobileCoins');
      }
      if (!util.isMobile() && $state.current.name !== 'dashboard.main') {
        $state.go('dashboard.main');
      }
    }

    //TODO: not not completed
    $scope.$watchCollection(
      function () {
        return $scope.addedByUserCoins;
      },
      function (newVal, oldVal) {
        if (newVal !== oldVal) {
          $timeout(function () {
            $scope.addedByUserCoins =
              $storage['dashboard-added-by-user-coins'] = [];
          }, 10000)
        }
      }
    )
  }
]);