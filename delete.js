var eejs              = require('ep_etherpad-lite/node/eejs/'),
    padManager        = require('ep_etherpad-lite/node/db/PadManager'),
    padMessageHandler = require("../../src/node/handler/PadMessageHandler"),
    settings          = require('../../src/node/utils/Settings');

// Add client code
exports.eejsBlock_scripts = function (hook_name, args, cb) {
    args.content = '<script src="../static/plugins/ep_delete_after_delay/static/js/reconnect.js"></script>' + args.content;
}

// Get settings
var areParamsOk = (settings.ep_delete_after_delay) ? true : false,
    delay, replaceText;
if (areParamsOk) {
    delay       = settings.ep_delete_after_delay.delay;
    replaceText = settings.ep_delete_after_delay.text || "The content of this pad has been deleted since it was older than the configured delay.";
    areParamsOk = (typeof delay === 'number' && delay > 0) ? true : false;
    if (areParamsOk === false) {
        console.error('ep_delete_after_delay.delay must be a number an not negative! Check you settings.json.');
    }
} else {
    console.error('You need to configure ep_delete_after_delay in your settings.json!');
}

exports.handleMessage = function(hook_name, context, cb) {
    if (areParamsOk === false) return false;

    var message = context.message,
           type = message.type;
    if (type === 'CLIENT_READY' || type === 'COLLABROOM') {
        var padId = (type === 'CLIENT_READY') ? message.padId : context.client.rooms[1];
        padManager.getPad(padId, function(callback, pad) {
            //
            // If this is a new pad, there's nothing to do
            if (pad.getHeadRevisionNumber() !== 0) {

                pad.getLastEdit(function(callback, timestamp) {
                    if (timestamp !== undefined && timestamp !== null) {
                        var currentTime = (new Date).getTime();

                        // Are we over delay?
                        if ((currentTime - timestamp) > (delay * 1000)) {

                            // Remove pad
                            padManager.removePad(padId);
                            console.info('Pad '+padId+' deleted since expired (delay: '+delay+' seconds, last edition: '+timestamp+').');

                            // Create new pad with an explanation
                            padManager.getPad(padId, replaceText, function() {
                                if (type === 'COLLABROOM') {
                                    // Create disconnect message
                                    var msg = {
                                        type: "COLLABROOM",
                                        data: {
                                            type: "CUSTOM",
                                            payload: {
                                                authorId: message.authorId,
                                                action: "requestRECONNECT",
                                                padId: padId
                                            }
                                        }
                                    };
                                    // Send disconnect message to all clients
                                    var sessions = padMessageHandler.sessioninfos;
                                    Object.keys(sessions).forEach(function(key){
                                        var session = sessions[key];
                                        padMessageHandler.handleCustomObjectMessage(msg, false, function(){
                                            // TODO: Error handling
                                        }); // Send a message to this session
                                    });
                                    cb(null);
                                } else {
                                    cb();
                                }
                            });
                        } else {
                            console.info('Nothing to do with '+padId+' (not expired)');
                            cb();
                        }
                    }
                });
            } else {
                console.info('New or empty pad '+padId);
                cb()
            }
        });
    } else {
        cb();
    }
};

// Send
function sendToTarget(message, msg){
}
