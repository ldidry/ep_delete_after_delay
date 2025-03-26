var already_notified = false;
var delay;

function get_ttl(callback) {
    $.ajax({
        url: `../ttl/${window.pad.getPadId()}`,
        method: 'GET',
        dataType: 'json',
        success: function(data, textStatus, jqXHR) {
            $('.ttl').remove();
            if (data.ttl === null) {
                delay = 1000;
            }
            if (data.ttl !== null && data.ttl > 0) {
                var text, ttl;
                if (data.ttl > 3600 * 24) {
                    text  = html10n.get('ep_delete_after_delay.days') || 'Your pad will be deleted if it is not edited in about XXXX days.';
                    ttl   = data.ttl/(3600 * 24);
                    delay = 3500 * 1000;
                } else if (data.ttl > 3600) {
                    text  = html10n.get('ep_delete_after_delay.hours') || 'Your pad will be deleted if it is not edited in about XXXX hours.'
                    ttl   = data.ttl/3600;
                    delay = 1800 * 1000; // 30 minutes
                } else {
                    text  = html10n.get('ep_delete_after_delay.minutes') || 'Your pad will be deleted if it is not edited in about XXXX minutes.';
                    ttl   = data.ttl/60;
                    delay = 600 * 1000 // 10 minutes
                }
                ttl  = Math.floor(ttl * 10)/10;
                text = text.replace(/XXXX/, ttl);
                var suggest = html10n.get('ep_delete_after_delay.suggest') || 'Please edit or export your pad if you need to save your work.';

                $.gritter.add({
                    class_name: 'ttl',
                    title: html10n.get('ep_delete_after_delay.close') || 'Delay before deletion',
                    text: `${text} ${suggest}`,
                    sticky: true,
                    position: 'bottom'
                });
                $('#close_expiration_notif').click(function() {
                    $(this).parents('.gritter-item').find('.gritter-close').click();
                });
            }
        },
        complete: function() {
            callback(delay);
        }
    });
}

function timeout_ttl(delay) {
    setTimeout(function() {
        get_ttl(timeout_ttl);
    }, delay);
}

exports.documentReady = function() {
    setTimeout(function() {
        get_ttl(timeout_ttl);
    }, 1000);
}
