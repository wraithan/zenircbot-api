var fs = require('fs');
var redis_lib = require('redis');
var through = require('through');


function ZenIRCBot(conf) {
    var args = process.argv.slice(2)
    if (args.length) {
        this.host = args[0]
        this.port = args[1]
        this.db = args[2]
    } else if (conf) {
        this.host = conf.host
        this.port = conf.port
       this.db = conf.db
    }
    this.redis = this.get_redis_client()
    this.out_channel = this.get_redis_client()
    this.out_channel.subscribe('in')
}

ZenIRCBot.prototype.send_privmsg = function(to, message) {
    this.publish_out('privmsg', to, message);
};

ZenIRCBot.prototype.send_action = function(to, message) {
    this.publish_out('privmsg_action', to, message);
};

ZenIRCBot.prototype.publish_out = function(type, to, message) {
    var self = this;
    if (typeof(to) == 'string') {
        to = [to];
    }
    to.forEach(function(destination) {
        self.redis.publish('out', JSON.stringify({
            version: 1,
            type: type,
            data: {
                to: destination,
                message: message
            }
        }));
    });
};

ZenIRCBot.prototype.join_channel = function(channel) {
    var self = this;
    self.redis.publish('out', JSON.stringify({
        version: 1,
        type: 'raw',
        command: 'JOIN ' + channel
    }));
};

ZenIRCBot.prototype.part_channel = function(channel, message) {
    var self = this;
    var message = message || 'Doing as my master bids.'
    self.redis.publish('out', JSON.stringify({
        version: 1,
        type: 'raw',
        command: 'PART ' + channel + ' :' + message
    }));
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
    var filtered = self.filter({version: 1, type: 'directed_privmsg'})
    filtered.on('data', function(msg){
        if (msg.data.message == 'commands') {
            commands.forEach( function(command) {
                self.send_privmsg(msg.data.sender,
                                  service + ': ' +
                                  command.name + ' - ' +
                                  command.description);
            });
        } else if (msg.data.message == 'services') {
            self.send_privmsg(msg.data.sender, service);
        }
    });
};

ZenIRCBot.prototype.get_redis_client = function() {
    return redis_lib.createClient(this.port,
                                  this.host, {
                                      selected_db: this.db
                                  });
};

ZenIRCBot.prototype.filter = function(query) {
    var stream = through()
    this.out_channel.on('message', function(subChannel, message) {
        var msg = JSON.parse(message)
        var results = true
        for (var param in query) {
            if (query.hasOwnProperty(param)) {
                results = results && msg[param] == query[param]
            }
        }
        if (results) {
            stream.queue(msg)
        }
    })
    return stream
};

function load_config(name) {
    return JSON.parse(fs.readFileSync(name, 'utf8'));
}

module.exports.ZenIRCBot = ZenIRCBot;
module.exports.load_config = load_config;
