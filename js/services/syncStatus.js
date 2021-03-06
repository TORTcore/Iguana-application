'use strict';

angular.module('IguanaGUIApp')
.service('$syncStatus', [
  '$filter',
  '$state',
  '$storage',
  '$timeout',
  '$interval',
  '$message',
  'vars',
  function($filter, $state, $storage, $timeout, $interval, $message, vars) {
    this.setPortPollResponse = function() {
      var coinsInfoJSON = [],
          result = false;

      for (var key in vars.coinsInfo) {
        if (key.length > 0 && key !== undefined && key !== 'undefined') {
          coinsInfoJSON.push({
            coin: key,
            connection: vars.coinsInfo[key].connection || false,
            RT: vars.coinsInfo[key].RT || false,
            relayFee: vars.coinsInfo[key].relayFee || 0
          });
        }
      }

      $storage['iguana-port-poll'] = {
        'updatedAt': Date.now(),
        'info': coinsInfoJSON,
        'isIguana': $storage.isIguana,
        'proxy': $storage.isProxy,
        'debugHTML': JSON.stringify($('#debug-sync-info').html())
      };

      if (dev.showConsoleMessages && dev.isDev) {
        console.log('port poll update');
      }
    };

    /* retrieve port poll data */
    this.getPortPollResponse = function(setPortPollResponseDS) {
      if (setPortPollResponseDS) {
        for (var i=0; i < setPortPollResponseDS.info.length; i++) {
          vars.coinsInfo[setPortPollResponseDS.info[i].coin] = {
            RT: setPortPollResponseDS.info[i].RT,
            connection: setPortPollResponseDS.info[i].connection,
            relayFee: setPortPollResponseDS.info[i].relayFee
          };
          $storage.isIguana = setPortPollResponseDS.isIguana;
          $storage.isProxy = setPortPollResponseDS.proxy;
        }

        if (dev.isDev && dev.showSyncDebug) { // debug info
          var debugSyncInfo = angular.element(document.getElementById('debug-sync-info')),
              transactionUnit = angular.element(document.getElementsByClassName('transactions-unit')),
              body = angular.element(document.body);

          if (setPortPollResponseDS.debugHTML) debugSyncInfo.html(JSON.parse(setPortPollResponseDS.debugHTML));
          body.css({ 'padding-bottom': debugSyncInfo.outerHeight() * 1.5 });
          $interval(function() {
            if (transactionUnit) transactionUnit.css({ 'margin-bottom': debugSyncInfo.outerHeight() * 1.5 });
            body.css({ 'padding-bottom': debugSyncInfo.outerHeight() * 1.5 });
          }, 1000);
        }
      }
    }

    this.syncStatus = function() {
      var body = $('body');

      if (dev.isDev && dev.showSyncDebug) {
        body.append('<div id=\"debug-sync-info\" style=\"position:fixed;background:#fff;bottom:0;width:100%;border-top:solid 1px #000;left:0;font-weight:bold;padding:10px 0;text-align:center\">sync info</div>');
        body.css({ 'padding-bottom': $('#debug-sync-info').outerHeight() * 1.5 });
      }

      $interval(function() {
        //console.clear();
        apiProto.prototype.testConnection();
      }, portPollUpdateTimeout * 1000);
    }

    this.checkIfIguanaOrCoindIsPresent = function() { // TODO: move portpoll service
      var numPortsResponding = 0;

      if (coinsInfo !== undefined)
        for (var key in coinsInfo) {
          if (coinsInfo[key].connection === true && coinsInfo[key].coin !== 'undefined') numPortsResponding++;
        }

      if (this.setPortPollResponseDS && ((!$storage['isIguana'] && !numPortsResponding) ||
          (this.setPortPollResponseDS.isIguana === false &&
          this.setPortPollResponseDS.proxy === true && !numPortsResponding) ||
          (this.setPortPollResponseDS.isIguana === false &&
          this.setPortPollResponseDS.proxy === false))) {
        $message.ngPrepMessageNoDaemonModal();

        // logout
        $timeout(function() {
          if (this.toState.name === 'dashboard.main' || this.toState.name === 'dashboard.settings') {
            this.logout();
          }
        }, 15000);
      } else {
        // 0.1.1, TODO: switch the below code
        // This property for delete duplicate Timeout functions for message Modal
        /*if (!window.messageModalTime) {
         window.messageModalTime;
         } else {
         clearTimeout(messageModalTime);
         }
         var messageModal = $('#messageModal');
         iguanaNullReturnCount = 0;
         messageModal.removeClass('in');
         messageModalTime = setTimeout(function() {
         messageModal.modal('hide');
         }, 250);*/

        var messageModal = angular.element('.iguana-modal'),
            iguanaNullReturnCount = 0;

        messageModal.removeClass('in');

        setTimeout(function() {
          messageModal.hide();
        }, 250);
      }
    };
  }
]);