var fs = require('fs');
var redis_lib = require('redis');
var pub = null;


ZenIRCBot = function(host, port, db) {
    this.host = host || 'localhost';
    this.port = port || 6379;
    this.db = db || 0;
}

ZenIRCBot.prototype.send_privmsg = function(to, message) {
    if (!pub) {
        pub = get_redis_client();
    }
    if (typeof(to) == 'string') {
        to = [to]
    }
    to.forEach(function(destination) {
        pub.publish('out', JSON.stringify({
            version: 1,
            type: 'privmsg',
            data: {
                to: destination,
                message: message
            }
        }))
    });
}

ZenIRCBot.prototype.send_admin_message = function(message) {
    var config = load_config('../bot.json');
    send_privmsg(config.servers[0].admin_spew_channels, message);
}

ZenIRCBot.prototype.register_commands = function(service, commands) {
    send_admin_message(service + ' online!')
    sub = get_redis_client();
    sub.subscribe('in');
    sub.on('message', function(channel, message){
        msg = JSON.parse(message)
        if (msg.version == 1 && msg.type == 'privmsg') {
            if (msg.data.message == 'commands') {
                commands.forEach( function(command, index) {
                    send_privmsg(msg.data.sender,
                                 service + ': ' +
                                 command.name + ' - ' +
                                 command.description);
                });
            }
        }
    });
    return sub
}

ZenIRCBot.prototype.get_redis_client = function(redis_config) {
    if (!redis_config) {
        redis_config = load_config('../bot.json').redis;
    }
    return redis_lib.createClient(redis_config.port,
                                  redis_config.host, {
                                      selected_db: redis_config.db
                                  });
}

function load_config(name) {
    return JSON.parse(fs.readFileSync(name, 'utf8'));
}

module.exports.ZenIRCBot = ZenIRCBot;
module.exports.load_config = load_config;
