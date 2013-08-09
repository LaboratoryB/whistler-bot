// ------------------------------------------- -
// ----- Whistler - the guts of the bot. ---- -
// ----------------------------------------- -

module.exports = function(bot, constants) {
	
	// Include the filesystem module.
	this.fs = require('fs');
	// And we want a synchronous exec.
	this.execSync = require("exec-sync");
    
	// Set our properties from the arguments upon instantiation.
	this.bot = bot;
    this.constants = constants;

    
    // --------------------------------------------------------- Handle command.
    this.commandHandler = function(text,from) {
    	
    	command = this.parseCommand(text,from);
    	if (command !== false) {
    		console.log(command);
    		switch(command.command) {
    			
    			case "crank":
    				this.cmdCrankCall(command.args,from);
    				break;
    				
    			default:
    				this.say("Sorry " + from + ", I don't know the command !" + command.command);
    				break;
    		
    		}

    	}
    	
    };
    
    // --------------------------------------------------------- Crank Call Function.
    this.cmdCrankCall = function(raw_arguments,from) {
    	console.log("Cool, I picked up the crank call command");
    	
    	if(/".+"\s*(\d{10})/.test(raw_arguments)) {
    		// Ok, it's in the correct format.
    		crank_text = raw_arguments.replace(/^"(.+)".+/,'$1');
			number = raw_arguments.replace(/^".+"\s*(\d+)$/,'$1');
		
			// Let's set up our file locations.
			file_flag = this.constants.FILE_FLAG;
			file_txt = this.constants.FILE_TXT;
			file_sound = this.constants.FILE_SOUND;
			file_writecall = this.constants.FILE_WRITECALL;
			file_movecall = this.constants.FILE_MOVECALL;
			file_asteriskfilename = this.constants.FILE_SOUND_ASTERISKFORMAT;
			
			// Do we already have a call in progress?
			if (this.fs.existsSync(file_flag)) {
				this.say(from + ", sorry man. There's already a call in progress (try again later)");
				return false;
			}
			
			// Great, now we need to write a few files.
			
			// first, our marker file (to let us know we're in progress).
			this.fs.writeFileSync(file_flag, ""); 
			
			// next, the text file.
			this.fs.writeFileSync(file_txt, crank_text);
			
			// Then, convert it with cepstral.
			cmd_cepstral = "/usr/local/bin/swift -p audio/encoding=ulaw,audio/sampling-rate=8000,speech/rate=155 -f " + file_txt + " -o " + file_sound;
			this.execSync(cmd_cepstral);
			
			// Then go ahead and write a call file.
			callfile = "Channel: Gtalk/asterisk/+1" + number + "@voice.google.com\n";
			callfile += "Context: " + this.constants.ASTERISK_CONTEXT + "\n";
			callfile += "Extension: s\n";
			callfile += "Priority: 1\n";
			callfile += "Application: Playback\n";
			callfile += "Setvar: filename=" + file_asteriskfilename + "\n";
			
			this.fs.writeFileSync(file_writecall, callfile); 
			
			// Now move it into asterisk's spool.
			cmd_move = "mv " + file_writecall + " " + file_movecall;
			this.execSync(cmd_move);
			
			// Now, we're done.
			this.say(from + ": No prob, I originated a call to " + number);
			
    		
    	} else {
    		// Incorrect format, let 'em now.
    		this.say("!crank expects a format like: \"<crank text>\" <10 digit number>");
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
    		console.log("raw",text);
    		console.log("command",command);
    		console.log("args",args);
    		
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
    	
    	this.bot.say(this.constants.IRC_CHANNEL, message);
		
    };

    
};