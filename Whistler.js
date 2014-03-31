// ------------------------------------------- -
// ----- Whistler - the guts of the bot. ---- -
// ----------------------------------------- -

module.exports = function(bot, mongoose, db, cleverbot, constants, privates) {
	
	// Include the filesystem module.
	this.fs = require('fs');
	// And we want a synchronous exec.
	this.execSync = require("exec-sync");
    // We'll want the request module, so we can fetch from a pastebin
	this.request = require("request");

	// Set our properties from the arguments upon instantiation.
	this.bot = bot;
    this.constants = constants;
    this.privates = privates;
    this.mongoose = mongoose;
    this.db = db;
    
    // We have a "Chat" object which uses mongo to make for a data-driven "chat" from this bot.
	Chat = require("./Chat.js");
	this.chat = new Chat(this.bot,this.mongoose,this.db,this.constants,this.privates);
    
	// This is an object which handles the delivery and storage of "notes" (messages to users for the next time they speak)
	Note = require("./Note.js");
	this.note = new Note(this.bot,this.chat,this.mongoose,this.db,this.constants,this.privates);
	
    
    // --------------------------------------------------------- Handle command.
    this.commandHandler = function(text,from) {
    	
    	// Ok, so, this is where we'll fire off the note handler (which checks to see if there's a "note" for someone.
    	this.note.handler(from);

        // Now let's see if someone dinged us, we'll respond as a clever bot if that is the case.
        namedetect = new RegExp("^" + privates.IRC_BOTNAME,'i');
        if (namedetect.test(text)) {

            // !bang
            // Now strip out the bot's name. So we get the raw text.
            namestrip = new RegExp("^" + privates.IRC_BOTNAME + "\\W+(.+)$",'i');
            strippedtext = text.replace(namestrip,'$1');

            // We can now send that to cleverbot.
            cleverbot.write(strippedtext,function(res){
                this.say(res.message);
            }.bind(this));

        } else {
        	
        	// Then we move onto literal commands.
        	
        	command = this.parseCommand(text,from);
        	if (command !== false) {
        		console.log(command);
        		switch(command.command) {
        		
        			case "":
        				// This happens when someone just speaks a "!" only in a single line, which happens on IRC more than one might think!
        				break;
        		
        			case "crank":
        				// Make a crank call.
        				this.cmdCrankCall(command.args,from);
        				break;
        				
        			case "pastecrank":
        				// Make a crank call from text on a paste bin.
        				this.cmdPasteCrank(command.args,from);
        				break;
        				
        			case "monitorcrank":
        				// Call the standard crank call method, but, say this is monitored.
        				this.cmdCrankCall(command.args,from,true);
        				break;
        				
        			case "note":
        				// Leave a note for someone to read the next time they speak.
        				this.note.leaveAMessage(from,command.args);
        				break;
        				
        			case "help":
        				// Ask for some help.
        				this.chat.say("help",[]);
        				break;
        				
        			default:
        				// Otherwise, we don't know what the heck.
        				this.chat.say("command_unknown",[from,command.command]);
        				break;
        		
        		}

        	}

        }
    	
    };
   
    // --------------------------------------------------------- Standard Crank Call Method (with optional "monitor" parameter [for a monitored crank call])
    this.cmdCrankCall = function(raw_arguments,from,monitor) {
    	
    	// Set a default of true for the do_file_move parameter.
		if (typeof monitor === 'undefined') {
			monitor = false;
		}
    	
    	// Check the format to see that it's got quoted text and a 10-digit number.
    	if(/".+"\s*(\d{10})/.test(raw_arguments)) {
    		// Ok, it's in the correct format.
    		// We can break it apart into the quoted text and 10 digit number.
    		crank_text = raw_arguments.replace(/^"(.+)".+/,'$1');
			number = raw_arguments.replace(/^".+"\s*(\d+)$/,'$1');
		
			// Now, shunt it out for a crank call, carrying along it's monitored status.
			this.makeACrankCall(crank_text,number,from,monitor);
			
    	} else {
    		// Incorrect format, let 'em now.
    		this.chat.say("crank_format",[]);
    	}
    	
    };
    
    // ---------------------------------------------------------- Crank call method from pastebin.com
    
    this.cmdPasteCrank = function(raw_arguments,from) {
    	
    	// Ok, check for the format of the command (a pastebin URL and a 10 digit number)
    	if (/pastebin.com\/.*\s*(\d{10})/.test(raw_arguments)) {
    		
    		// Pull the pastebin ID out, and also the number.
    		pastebin_id = raw_arguments.replace(/^.+pastebin.com\/(.+)\s+.+$/,'$1');
    		number = raw_arguments.replace(/^.+pastebin.com\/.+?\s+(\d+)$/,'$1');
    		
    		console.log('paste id',pastebin_id);
    		console.log('number',number);
    		
    		if (pastebin_id.length > 2) {
    			
    			// Create the pastebin url
    			
    			pastebin_url = "http://pastebin.com/raw.php?i=" + pastebin_id;
    			
    			// Now go and get that URL
    			// Make the http request, and process getting the return, asynchronously.
    			
				this.request.get(pastebin_url, function (error, response, body) {
					if (!error) {
						// console.log('the body!',body);
						// Great, we got the body back, let's make it into a crank call.
						this.makeACrankCall(body,number,from);
			    		
					} else {
						this.chat.say("pastebin_weberror",[error.code]);
					}
				}.bind(this));
    			
    		} else {
    			this.chat.say("pastebin_iderror",[]);
    		}
    		
    	} else {
    		this.chat.say("pastebin_format",[]);
    	}
    	
    };
    
    // --------------------------------------------------------- Is crank locked? We set a lockfile to say there's a call in progress. But, we also delete a stale lockfile.
    
    this.isCrankLocked = function() {
    
    	if (this.fs.existsSync(this.constants.FILE_FLAG)) {
			
    		// Let's see how old this file is.
    		// Stat the file.
    		stat = this.fs.statSync(this.constants.FILE_FLAG);
 
    		// Get the time now in unix time, and the unix time of the flag file.
    		nowdate = new Date();
    		nowtime = Math.round(nowdate.getTime()/1000);
    		
    		moddate = new Date(Date.parse(stat.mtime));
    		modtime = Math.round(moddate.getTime()/1000);
    		
    		// So how old is that?
    		fileage = nowtime - modtime;
    		
			// If it's too old, we're just going to delete it
			if (fileage > this.constants.FILE_FLAG_MAXAGE) {
				// Just delete it.
				cmd_remove = "rm -f " + this.constants.FILE_FLAG;
				this.execSync(cmd_remove);
				// And of course, consider that crank IS NOT locked.
				return false;
			}
    		
    		return true;
		} else {
			return false;
		}
		
    	
    };
    
    // --------------------------------------------------------- Use template call files and move them into asterisk
    // --- callfile: the template file to use.
    // --- writecallfile: the place to write the callfile after we fill out the template.
    // --- arguments: associative hash with the item to replace and what to replace it with.
    // --- 		a la: { NUMBER: 8005551212, CONTEXT: foobar }
    // --- do_file_move: boolean (optional, assumes true), do we move the call file after we create it? (Sometimes we don't want to, we want asterisk to do so)
    this.useCallFile = function(callfile,writecallfile,arguments,do_file_move) {

		// Set a default of true for the do_file_move parameter.
		if (typeof do_file_move === 'undefined') {
			do_file_move = true;
		}    	

    	// Read the file into a string.
    	filecontents = this.fs.readFileSync(callfile,{encoding: "ascii"});

    	console.log(filecontents);
    	console.log(arguments);
    	
    	// Cycle through the key/value pairs in the arguments, and replace as necessary.
    	for (key in arguments) {
    	    val = arguments[key];
    	    // Each key in the template is wrapped in curlies, like {VARIABLE}
    	    re = new RegExp("{" + key + "}");
    	    filecontents = filecontents.replace(re,val);
    	}
    	
    	console.log(filecontents);
    	
    	// Go ahead and write that file where we expect it.
    	this.fs.writeFileSync(writecallfile, filecontents); 
		
    	// If we specify to move it, continue.
    	if (do_file_move) {
    		// Now move it into asterisk's outgoing spool.
    		cmd_move = "mv " + writecallfile + " " + this.constants.FILE_OUTGOINGSPOOL;
			this.execSync(cmd_move);
    	}
    	
    };
    
    // --------------------------------------------------------- Setting a lock file.
    
    this.setLockFile = function() {
    	
    	// first, our marker file (to let us know we're in progress).
		this.fs.writeFileSync(this.constants.FILE_FLAG, ""); 
		
		// Chown that file, because we need asterisk to operate on it.
		cmd_chown = "chown " + this.constants.FILE_OWNER + ":" + this.constants.FILE_GROUP + " " + this.constants.FILE_FLAG;
		this.execSync(cmd_chown);
		
		// And chmod it.
		cmd_chmod = "chmod " + this.constants.FILE_MODE + " " + this.constants.FILE_FLAG;
		this.execSync(cmd_chmod);
    	
    };
    
    // --------------------------------------------------------- Create a text-to-speach file.
    
    this.createTTS = function(text) {
    	
    	// create a text file, from the given text.
		this.fs.writeFileSync(this.constants.FILE_TXT, text);
		
		// Then, convert it with cepstral.
		cmd_cepstral = "/usr/local/bin/swift -p audio/encoding=ulaw,audio/sampling-rate=8000,speech/rate=155 -f " + this.constants.FILE_TXT + " -o " + this.constants.FILE_SOUND;
		this.execSync(cmd_cepstral);
		
		
    	
    };
    
    // --------------------------------------------------------- Method to make the crank call from whatever method above (via web or other).
    
    this.makeACrankCall = function(crank_text,number,from,monitored) {
    	
		// Do we already have a call in progress?
		if (this.isCrankLocked()) {
			this.chat.say("crank_callinprogress",[from]);
			return false;
		} else {
			// We create a lock file.
			this.setLockFile();
		}
		
		// Now, create the text-to-speach
		this.createTTS(crank_text);
		
		// Insert our number into our "constant" channel as defined in the configs.
		channel = this.constants.ASTERISK_CHANNEL.replace(/{NUMBER}/,number);
    	
		if (!monitored) {
			
			// And we'll make a call file for that, with the PLAIN template.
			this.useCallFile(this.constants.CALLFILE_TEMPLATE_PLAIN,this.constants.CALLFILE_RESULT_PLAIN,{ 
				CHANNEL: channel, 
				CONTEXT: this.constants.ASTERISK_CONTEXT, 
				FILENAME: this.constants.FILE_SOUND_ASTERISKFORMAT
			});
			
			// Now, we're done, output that to chat.
			this.chat.say("crank_success",[from,number]);
			
		} else {
			
			// Ok, this one is monitored. 
			// We really make two call files.
			// Neither of which we move. We wait for the caller to come in, and we let asterisk move them at the appropriate times.
			
			// This one calls the person who's being cranked.
			this.useCallFile(this.constants.CALLFILE_TEMPLATE_CONFERENCE,this.constants.CALLFILE_RESULT_CONFERENCE,{ 
				CHANNEL: channel, 
				CONTEXT: this.constants.ASTERISK_CONTENT_CONFERENCE, 
			},false);
			
			// And this one is so asterisk can originate a local channel to speak the file.
			this.useCallFile(this.constants.CALLFILE_TEMPLATE_SPEAK,this.constants.CALLFILE_RESULT_SPEAK,{ 
				CONTEXT: this.constants.ASTERISK_CONTEXT_CONFERENCETALKER, 
				FILENAME: this.constants.FILE_SOUND_ASTERISKFORMAT
			},false);
			
			this.chat.say("crank_monitored",[from,number]);
			
		}
		
		
		
		
		
    };
    
    
    // --------------------------------------------------------- Parse a command.
    this.parseCommand = function(text,from) {
    	
    	// Trim down the text, first.
    	text = text.trim();
    	
    	if (/^!/.test(text)) {
    		// Ok this is a command. 
    		// Let's see if it has arguments.
    		if (/^!\w+\s.+$/.test(text)) {
    			// It has arguments. Let's get the parts.
    			command = text.replace(/^!(.+?)\s.+$/,'$1');
    			args = text.replace(/^!.+?\s(.+)$/,'$1');
    		} else {
    			// It's a bareword command. Just take the bareword (and leave args empty)
    			command = text.replace(/^!(.+)?/,'$1');
    			args = "";
    		}
    		
    		// Log my parts for debugging (temporarily)
    		if (this.privates.IRC_DEBUG) {
    			console.log("raw",text);
    			console.log("command",command);
    			console.log("args",args);
    		}
    		
    		return {
    			command: command,
    			args: args,
    		};
    		
    		
    	} else {
    		// This is not a command.
    		return false;
    	}
    	
    };
    
    // ---------------------------------------------------------- Say something to the room.
    this.say = function(message) {
    	
    	this.bot.say(this.privates.IRC_CHANNEL, message);
		
    };
    
    

    
    
};
