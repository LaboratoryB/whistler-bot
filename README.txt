== Welcome to Whistler! ==

This is an IRC bot written in node.js that makes crank calls using text-to-speech (TTS)

It employs cepstral & asterisk to get the job done on the back-end.

You should be able to strip out cepstral for another TTS engine, like festival without a lot of work.

== Requirements ==

Requires mongodb.

Requires extra node modules:
- irc
- exec-sync
- moment
- mongoose

Requires internal (should come with your node) modules:
- fs

== Install ==

* Firstly, copy the file "config_private.js" to "config_private_mine.js" and (optionally) add to svn ignore.

[user@host]$ cp config_private.js config_private_mine.js
[user@host]$ svn propset svn:ignore config_private_mine.js .

* Secondly, you should be able to get the modules you need right in this cwd with npm, 

[user@host]$ npm install

It should read from the package.json included here.

Or install the packages manually. ("npm install module-name" for each required module)

* You'll want to import the mongo db's (you can find the original json files in the db/ directory)

mongoimport --db whistler --collection chat --file chat.json
mongoimport --db whistler --collection notes --file notes.json


* To export the mongo db's

mongoexport --db whistler --collection chat --out chat.json
mongoexport --db whistler --collection notes --out notes.json

== Basic Usage ==

- irc_config.js

This is where the bulk of your setup will happen. 

One rather important thing you'll need to change is the ASTERISK_CHANNEL constant.

This is the channel which will be dialed, and has a token that looks like {NUMBER} which defines where your 10 digit phone number to dial will be.

If you have a SIP device configured in Asterisk's sip.conf that's called [itsp] your channel may look like:

SIP/itsp/{NUMBER}

For example. The default is for a google voice channel (as that's what we used while building this)


== Asterisk Setup ==

- Dial plan.

The call file that's created uses an context & extension in Asterisk, and a sample dialplan is included in the dialplan/ folder.

- File permissions.

The first thing you'll need to overcome is running both Asterisk, and this application with file permissions that allow them to cooperate.

Namely, both operate on some files that are written (by default, but configurable) to /var/spool/asterisk/tmp/ as well as a call file which gets put in /var/spool/asterisk/outgoing

If both the user for Asterisk and the user you run this application (whistler-bot) have write permissions there, you're good to go.

Personally, I recommend a configuration for Asterisk where Asterisk runs as it's own user and group, and you create a user for yourself, which is part of the same group.

You can read about how to configure Asterisk that way at my blog @ http://dougbtv.com/?p=174

If the user you run this bot as is a member of the asterisk group, you can then issue:

chown -R asterisk:asterisk /var/spool/asterisk/tmp
chmod -R 0775 /var/spool/asterisk/tmp

== More ==


