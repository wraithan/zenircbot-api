var fs = require('fs');
var redis_lib = require('redis');


function ZenIRCBot(host, port, db) {
    var self = this;
    self.host = host || 'localhost';
    self.port = port || 6379;
    self.db = db || 0;
    self.redis = self.get_redis_client();
}

ZenIRCBot.prototype.send_privmsg = function(to, message) {
    var self = this;
    if (typeof(to) == 'string') {
        to = [to];
    }
    to.forEach(function(destination) {
        self.redis.publish('out', JSON.stringify({
            version: 1,
            type: 'privmsg',
            data: {
                to: destination,
                message: message
            }
        }));
    });
};

ZenIRCBot.prototype.send_admin_message = function(message) {
    var self = this;
    self.redis.get('zenircbot:admin_spew_channels', function(err, channels) {
        self.send_privmsg(channels, message);
    });
};

ZenIRCBot.prototype.register_commands = function(service, commands) {
    var self = this;
    self.send_admin_message(service + ' online!');
    var sub = self.get_redis_client();
    sub.subscribe('in');
    sub.on('message', function(channel, message){
        var msg = JSON.parse(message);
        if (msg.version == 1) {
            if (msg.type == 'directed_privmsg') {
                if (msg.data.message == 'commands') {
                    commands.forEach( function(command, index) {
                        self.send_privmsg(msg.data.sender,
                                          service + ': ' +
                                          command.name + ' - ' +
                                          command.description);
                    });
                } else if (msg.data.message == 'services') {
                    self.send_privmsg(msg.data.sender, service);
                }
            }
        }
    });
    return sub;
};

ZenIRCBot.prototype.get_redis_client = function() {
    var self = this;
    return redis_lib.createClient(self.port,
                                  self.host, {
                                      selected_db: self.db
                                  });
};

function load_config(name) {
    return JSON.parse(fs.readFileSync(name, 'utf8'));
}

module.exports.ZenIRCBot = ZenIRCBot;
module.exports.load_config = load_config;
