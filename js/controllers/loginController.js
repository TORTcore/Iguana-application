'use strict';

angular.module('IguanaGUIApp')
.controller('loginController', [
  '$scope',
  '$http',
  '$state',
  'util',
  '$auth',
  '$uibModal',
  '$api',
  '$storage',
  '$timeout',
  '$rootScope',
  '$filter',
  '$message',
  'vars',
  function($scope, $http, $state, util, $auth, $uibModal, $api, $storage,
           $timeout, $rootScope, $filter, $message, vars) {
    var pageTitle;

    $storage['iguana-active-coin'] = {};
    $storage['iguana-login-active-coin'] = {};
    $scope.util = util;
    $scope.coinsInfo = vars.coinsInfo;
    $scope.isChanged = false;
    $scope.$auth = $auth;
    $scope.$state = $state;
    $scope.isIguana = $storage.isIguana;
    $scope.passphraseModel = '';
    $scope.addedCoinsOutput = '';
    $scope.failedCoinsOutput = '';
    $scope.$modalInstance = {};
    $scope.coinResponses = [];
    $scope.coins = [];
    $scope.activeCoins = $storage['iguana-login-active-coin'] || {};
    $storage['iguana-active-coin'] = {};
    $scope.messages = '';
    $scope.loginActiveCoin = '';
    $rootScope.background = true;
    $scope.title = setTitle;
    $scope.login = login;
    $scope.goBack = goBack;
    $scope.setIsChanged = isChanged;
    $scope.isCoinSelected = isCoinSelected;
    $scope.getActiveCoins = getActiveCoins;
    $scope.openFlowModal = openFlowModal;
    $scope.openCoinModal = openCoinModal;
    $scope.karma = { // tests
      setTitle: setTitle,
      stateChangeStart: stateChangeStart
    };
    $scope.$on('$stateChangeStart', stateChangeStart);

    if (!$scope.coinsInfo) {
      $rootScope.$on('coinsInfo', onInit);
    } else {
      onInit();
    }

    if ($state.current.name === 'login.step2') {
      $rootScope.background = false;
    }

    // TODO: will be removed
    function onInit() {
      $scope.coins = [];
    }

    function getActiveCoins() {
      return $storage['iguana-login-active-coin'];
    }

    function isCoinSelected() {
      if (!$storage['iguana-login-active-coin']) {
        $storage['iguana-login-active-coin'] = {};
      }

      return Object.keys($storage['iguana-login-active-coin']).length === 0;
    }

    function stateChangeStart() {
      if ($state.current.name === 'login') {
        $rootScope.background = false;
      } else if ($state.current.name === 'login.step2') {
        $rootScope.background = true;
      }
    }

    function openFlowModal(type) {
      $scope.modal.flowModal.animation = type ? true : false;
      $scope.modal.flowModal.resolve = {
        'type': function() {
          return type ? type : 'signin';
        },
        'modal': function () {
          return $scope.modal;
        }
      };

      var modalInstance = $uibModal.open($scope.modal.flowModal);
      modalInstance.result.then(resultPromise);

      function resultPromise(event, data) {

      }
    }

    function openCoinModal(type) {
      if (type === 'signin') {
        $storage['iguana-login-active-coin'] = {};
        $storage['iguana-active-coin'] = {};
      }

      $scope.modal.coinModal.resolve = {
        'type': function() {
          return type;
        },
        'modal': function () {
          return $scope.modal;
        }
      };

      var modalInstance = $uibModal.open($scope.modal.coinModal);

      modalInstance.result.then(resultPromise);

      function resultPromise(data) {
        if (type === 'signin') {
          var coinKeys = Object.keys($storage['iguana-login-active-coin']);
          $scope.coins = data;
          $scope.passphraseModel = coinKeys.length ? $storage['iguana-login-active-coin'][coinKeys[0]].pass : '';
          $state.go('login.step2');
        } else {
          $scope.loginActiveCoin = $storage['iguana-login-active-coin'];
          $state.go('signup.step1');
        }
      }

      $scope.karma.modal = modalInstance; // tests
    }

    function login() {
      $auth.login(
        $scope.getActiveCoins(),
        $scope.passphraseModel
      );
    }

    function setTitle() {
      pageTitle = $filter('lang')('LOGIN.LOGIN_TO_WALLET');

      if (
        $storage['iguana-login-active-coin'] &&
        Object.keys($storage['iguana-login-active-coin']).length &&
        $storage['iguana-login-active-coin'][Object.keys($storage['iguana-login-active-coin'])[0]]
      ) {
        pageTitle = pageTitle.replace('{{ coin }}', $storage['iguana-login-active-coin'][Object.keys($storage['iguana-login-active-coin'])[0]].name);
      }

      return pageTitle;
    }

    function isChanged() {
      $scope.messages = $filter('lang')('LOGIN.INCORRECT_INPUT').replace('{{ count }}', $scope.isIguana ? '24' : '12');
      $scope.isChanged = true;
    }

    function goBack() {
      $storage['iguana-login-active-coin'] = {};
      $state.go('login');
      openCoinModal('signin');
    }
  }
]);