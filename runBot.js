
// ------------------------------------------------ -
// ----------------- Reference Docs -------------- -
// ---------------------------------------------- -
// irc api docs: http://tinyurl.com/nodeircdocs


// -- Requires
var irc = require("irc");						// IRC Module (npm installed)
var constants = require("./irc_config.js");		// Constants module (w/ IRC configs)
var Whistler = require("./Whistler.js");		// The Whistler object, the meat of our dealings.

// whistler.foo();
// whistler.bar();

// ----------------------------- Create the irc bot object.
var bot = new irc.Client(constants.IRC_SERVER, constants.IRC_BOTNAME, {
    userName: constants.IRC_BOTNAME,
    realName: 'nodeJS IRC client',
    port: 7000,
    debug: constants.IRC_DEBUG,
    showErrors: false,
    autoRejoin: true,
    autoConnect: false,
    channels: [constants.IRC_CHANNEL],
    secure: true,
    selfSigned: true,
    certExpired: true,
    floodProtection: false,
    floodProtectionDelay: 1000,
    stripColors: true,
    channelPrefixes: "&#",
    messageSplit: 512
});

// Now that we've got a bot, we can pass this to whistler.
var whistler = new Whistler(bot,constants);

// -------------------------------- Manually connect (so we can have a callback when it finishes)
if (constants.IRC_ENABLED) {
	bot.connect(function() {
		// Ok we're connected.
		console.log("Cool, we connected");
		bot.say("nickserv", "identify " + constants.IRC_IDENTPASS);
	});
} else {
	console.log("WARNING: IRC disabled (usually this is for debugging)");
}

bot.addListener("message", function(from, to, text, message) {
	
	/* console.log("message",message);
	console.log("text",text);
	console.log("from",from);
	console.log("to",to); */
	
	// Let's have whistler handle this command.
	whistler.commandHandler(text,from);
	
});



