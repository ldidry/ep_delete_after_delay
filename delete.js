var eejs              = require('ep_etherpad-lite/node/eejs/'),
    API               = require('ep_etherpad-lite/node/db/API'),
    padManager        = require('ep_etherpad-lite/node/db/PadManager'),
    padMessageHandler = require('ep_etherpad-lite/node/handler/PadMessageHandler'),
    settings          = require('ep_etherpad-lite/node/utils/Settings'),
    async             = require('ep_etherpad-lite/node_modules/async'),
    fs                = require('fs');

fs.mkdir('deleted_pads', function(err) {});

// Add client code
exports.eejsBlock_scripts = function (hook_name, args, cb) {
    args.content = '<script src="../static/plugins/ep_delete_after_delay/static/js/reconnect.js"></script>' + args.content;
}

// Get settings
var areParamsOk = (settings.ep_delete_after_delay) ? true : false,
    delay, replaceText, loopDelay, deleteAtStart;
if (areParamsOk) {
    delay         = settings.ep_delete_after_delay.delay;
    loopDelay     = settings.ep_delete_after_delay.loopDelay || 3600;
    deleteAtStart = settings.ep_delete_after_delay.deleteAtStart || true;
    replaceText   = settings.ep_delete_after_delay.text || "The content of this pad has been deleted since it was older than the configured delay.";
    areParamsOk   = (typeof delay === 'number' && delay > 0) ? true : false;
    if (areParamsOk === false) {
        console.error('ep_delete_after_delay.delay must be a number an not negative! Check you settings.json.');
    }
    areParamsOk = (typeof loopDelay === 'number' && loopDelay > 0) ? true : false;
    if (areParamsOk === false) {
        console.error('ep_delete_after_delay.loopDelay must be a number an not negative! Check you settings.json.');
    }
} else {
    console.error('You need to configure ep_delete_after_delay in your settings.json!');
}

// Recurring deletion function
var waitForIt = function() {
    setTimeout(function() {
        console.info('New loop');
        delete_old_pads();
        waitForIt();
    }, loopDelay * 1000);
};

// Delete old pads at startup
if (deleteAtStart) {
    delete_old_pads();
}

// start the recurring deletion loop
waitForIt();

// deletion loop
function delete_old_pads() {
    // Deletion queue (avoids max stack size error), 2 workers
    var q = async.queue(function (pad, callback) {
        API.getHTML(pad.id, function(err, d) {
            if (err) {
                return callback(err);
            }
            var currentTime = (new Date).getTime();
            fs.writeFile('deleted_pads/'+pad.id+'-'+currentTime+'.html', d.html, function(err) {
                pad.remove(callback);
            });
        });
    }, 2);
    // Emptyness test queue
    var p = async.queue(function(padId, callback) {
        padManager.getPad(padId, function(err, pad) {
            // If this is a new pad, there's nothing to do
            var head = pad.getHeadRevisionNumber();
            if (head !== null  && head !== undefined && head !== 0) {
                pad.getLastEdit(function(callback, timestamp) {
                    if (timestamp !== undefined && timestamp !== null) {
                        var currentTime = (new Date).getTime();
                        // Are we over delay?
                        if ((currentTime - timestamp) > (delay * 1000)) {
                            console.debug('Pushing %s to q queue', pad.id);
                            // Remove pad
                            q.push(pad, function (err) {
                                console.info('Pad '+pad.id+' deleted since expired (delay: '+delay+' seconds, last edition: '+timestamp+').');
                                // Create new pad with an explanation
                                padManager.getPad(padId, replaceText, function() {
                                    // Create disconnect message
                                    var msg = {
                                        type: "COLLABROOM",
                                        data: {
                                            type: "CUSTOM",
                                            payload: {
                                                authorId: null,
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
                                });
                            });
                        } else {
                            console.debug('Nothing to do with '+padId+' (not expired)');
                        }
                    }
                });
            } else {
                console.debug('New or empty pad '+padId);
            }
            callback();
        });
    }, 1);
    padManager.listAllPads(function (err, data) {
        for (var i = 0; i < data.padIDs.length; i++) {
            var padId = data.padIDs[i];
            console.debug('Pushing %s to p queue', padId);
            p.push(padId, function (err) { });
        }
    });
}

exports.handleMessage = function(hook_name, context, cb) {
    if (areParamsOk === false) return false;

    var message = context.message,
           type = message.type;
    if (type === 'CLIENT_READY' || type === 'COLLABROOM') {
        var padId = (type === 'CLIENT_READY') ? message.padId : context.client.rooms[1];
        padManager.getPad(padId, function(callback, pad) {

            // If this is a new pad, there's nothing to do
            if (pad.getHeadRevisionNumber() !== 0) {

                pad.getLastEdit(function(callback, timestamp) {
                    if (timestamp !== undefined && timestamp !== null) {
                        var currentTime = (new Date).getTime();

                        // Are we over delay?
                        if ((currentTime - timestamp) > (delay * 1000)) {

                            API.getHTML(padId, function(err, d) {
                                if (err) {
                                    return cb(err);
                                }
                                fs.writeFile('deleted_pads/'+padId+'-'+currentTime+'.html', d.html, function(err) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    // Remove pad
                                    padManager.removePad(padId);
                                    console.info('Pad '+padId+' deleted since expired (delay: '+delay+' seconds, last edition: '+timestamp+').');

                                    // Create new pad with an explanation
                                    padManager.getPad(padId, replaceText, function() {
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
                                        if (type === 'COLLABROOM') {
                                            cb(null);
                                        } else {
                                            cb();
                                        }
                                    });
                                });
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

exports.registerRoute  = function (hook_name, args, cb) {
    args.app.get('/ttl/:pad', function(req, res, next) {
        var padId = req.params.pad;

        res.header("Access-Control-Allow-Origin", "*");
        res.setHeader('Content-Type', 'application/json');

        padManager.getPad(padId, function(callback, pad) {

            // If this is a new pad, there's nothing to do
            if (pad.getHeadRevisionNumber() !== 0) {

                pad.getLastEdit(function(callback, timestamp) {
                    if (timestamp !== undefined && timestamp !== null) {
                        var currentTime = (new Date).getTime();

                        var ttl = Math.floor((delay * 1000 - (currentTime - timestamp))/1000);
                        res.send('{"ttl": '+ttl+'}');
                    }
                });
            } else {
                res.send('{"ttl": null, "msg": "New or empty pad"}');
            }
            cb && cb();
        });
    });
}
