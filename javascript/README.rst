JavaScript
==========

This is in dev currently.

Once it is released you'll be able to do the following::

    $ npm install zenircbot-api

And you'll be able to use it like so::

    var ZenIRCBot = require('zenircbot-api').ZenIRCBot

    var client = new ZenIRCBot(hostname='redis.server.location', port=6379)
    client.send_privmsg(to='#channel', message='ohai')

Docs are availabe at: http://zenircbot.rtfd.org/
