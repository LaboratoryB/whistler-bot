// Creates a "constants" object with defines
// To use like, well, defined constants, but... pack it up real nice.
// Idea: http://stackoverflow.com/questions/8595509/how-do-you-share-constants-in-nodejs-modules

function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

// ---------------------------------- IRC Constants
define("IRC_CHANNEL",'#smcbot');
define("IRC_BOTNAME",'zenodebottest');
define("IRC_IDENTPASS",'imnotregistered');
define("IRC_SERVER",'irc.freenode.net');
define("IRC_ENABLED",true);
define("IRC_DEBUG",true);

//---------------------------------- File Path Constants
define("FILE_FLAG",'/tmp/whistler.flag');				// The file we set to "flag" that a call is in progress (asterisk removes it when done)
define("FILE_TXT",'/tmp/say.txt');						// Where we write the contents of the text-to-be-spoken
define("FILE_SOUND",'/tmp/crank.ulaw');					// The target sound file.
define("FILE_SOUND_ASTERISKFORMAT",'/tmp/crank');		// This is the sound file without the extension.
define("FILE_WRITECALL",'/tmp/crank.call');				// Where we'll write the call file.
define("FILE_MOVECALL",'/var/spool/asterisk/outgoing/');// Where we want the call file to end up (in Asterisk's spool)

// --------------------------------- Asterisk-specific constants.
define("ASTERISK_CONTEXT",'crankcall');