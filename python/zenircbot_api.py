import json
import gevent
from gevent import monkey
from redis import StrictRedis


monkey.patch_all()

def load_config(name):
    with open(name) as f:
        return json.loads(f.read())


__version__ = '2.2.3'


class ZenIRCBot(object):

    def __init__(self, host='localhost', port=6379, db=0):
        self.host = host
        self.port = port
        self.db = db
        self.redis = StrictRedis(host=self.host,
                                 port=self.port,
                                 db=self.db)

    def send_privmsg(self, to, message):
        if isinstance(to, basestring):
            to = (to,)
        for channel in to:
            self.get_redis_client().publish('out',
                                            json.dumps({
                                                'version': 1,
                                                'type': 'privmsg',
                                                'data': {
                                                    'to': channel,
                                                    'message': message,
                                                }}))

    def send_admin_message(self, message):
        admin_channels = self.redis.get('zenircbot:admin_spew_channels')
        self.send_privmsg(admin_channels, message)

    def non_blocking_redis_subscribe(self, func, args=[], kwargs={}):
        pubsub = self.get_redis_client().pubsub()
        pubsub.subscribe('in')
        for msg in pubsub.listen():
            message = json.loads(msg['data'])
            func(message=message, *args, **kwargs)

    def register_commands(self, service, commands):
        self.send_admin_message(service + ' online!')
        if commands:
            def registration_reply(message, service, commands):
                if message['version'] == 1:
                    if message['type'] == 'directed_privmsg':
                        if message['data']['message'] == 'commands':
                            for command in commands:
                                self.send_privmsg(message['data']['sender'],
                                                  '%s: %s - %s' % (
                                                      service,
                                                      command['name'],
                                                      command['description']
                                                  ))
            redis_sub = gevent.spawn(self.non_blocking_redis_subscribe,
                                     func=registration_reply,
                                     kwargs={'service': service,
                                             'commands': commands})

    def get_redis_client(self):
        return StrictRedis(host=self.host,
                           port=self.port,
                           db=self.db)