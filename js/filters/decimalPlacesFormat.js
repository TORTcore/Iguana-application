'use strict';

angular.module('IguanaGUIApp')
.filter('decimalPlacesFormat', function() {
  return function(value, type, limit) {
    if (value && type) {
      var valueComponents = value.toString().split('.'),
          decimalPlaces = {
            coin: 0,
            currency: 0
          };

      if (value < 1 && value > 0) {
        for (var i=valueComponents[1].length ; i > -1; i--) {
          if (Number(valueComponents[1][i]) !== 0) {
            if (i > settings.maxDecimalPlacesLimit && limit)
              i = settings.maxDecimalPlacesLimit; // max. decimal places limit

            decimalPlaces.coin = i;
            decimalPlaces.currency = decimalPlaces.coin;
            break;
          }
        }
      } else {
        decimalPlaces.coin = settings.decimalPlacesCoin;
        decimalPlaces.currency = settings.decimalPlacesCurrency;
      }

      if (!valueComponents[1]) { // show only the whole number if right part eq zero
        decimalPlaces.coin = decimalPlaces.currency = 0;
      }
    }
    return decimalPlaces ?
      Number(value).toFixed(
        (decimalPlaces[type] < 20 ? decimalPlaces[type] : 19)
      ) :
      '';
  };
});