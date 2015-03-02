if(typeof exports == 'undefined'){
    var exports = this['mymodule'] = {};
}
exports.handleClientMessage_CUSTOM = function(hook, context, wut){
    if(context.payload.action === 'requestRECONNECT'){
        window.location.reload();
    }
}
