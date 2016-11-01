/*!
 * Iguana helpers/Timeago
 * 
 */

helperProto.prototype.timeago = function () {
  var timeeago = $('.timeeago', document),
    threshold = settings.thresholdTimeago,
    displayText = '';
  if (!timeeago.prop('data-original')) {
    timeeago.prop('data-original', timeeago.clone());
  }
  var timeeagoOriginal = timeeago.prop('data-original');
  var date = $('.timeeago-date', timeeagoOriginal).text(),
    time = $('.timeeago-time', timeeagoOriginal).text();
  var timestump = date + ' ' + time;
  var original = new Date(timestump),
    current = new Date(),
    dayTemplate = 24 * 60 * 60 * 1000,
    timeTemplate = 60 * 60 * 1000,
    minuteTemplate = 60 * 1000;
  var difference = current - original;

  if ((threshold.hasOwnProperty('day') && (difference / dayTemplate) > threshold.day) ||
    (threshold.hasOwnProperty('time') && (difference / timeTemplate) > threshold.time) ||
    (threshold.hasOwnProperty('minute') && (difference / minuteTemplate) > threshold.minute)
  ) {
    return;
  }

  if (difference / dayTemplate < 1) {
    if (difference / timeTemplate < 1) {
      if (difference / minuteTemplate > 1) {
        displayText = parseInt(difference / timeTemplate) + ' Minute ago';
      } else {
        displayText = 'Moment ago';
      }
    } else {
      displayText = parseInt(difference / timeTemplate) + ' Time ago';
    }
  } else {
    displayText = parseInt(difference / timeTemplate) + ' Dey ago';
  }

  timeeago.text(displayText);

}