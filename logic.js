function refreshPane(pane){
	if(typeof(pane.cmd)=="string"){
		r2.cmd(pane.cmd, function(res){
			pane.pane.content.innerHTML="<pre>"+res+"</pre>";
		})
	}
	else if(typeof(pane.cmd)=="function"){
		pane.cmd(pane.pane);
	}
}

function refreshPanes(panes){
	r2.cmd(automatic_commands, function(){});
	for(var i=0;i<panes.length;i++){
		if(!document.contains(panes[i].pane.content)){
			panes.splice(i,1);
			i--;
			continue;
		}
		refreshPane(panes[i]);
	}
}

function txtSizeAdd(x){
	var fs=document.body.style.fontSize;
	if(fs===""){
		fs="13px";
	}
	fs=fs.substr(0,fs.length-2); // Strip "px".
	fs=parseInt(fs, 10);
	fs+=x;
	fs+="px";
	document.body.style.fontSize=fs;
}
txtSizeAdd(0); // Set to initial value of 13px.

var history_of_commands=[""];
var history_index=0;
function key_down(txt, e){
	if(e.which==13){ // Enter key.
		history_of_commands[history_of_commands.length-1]=txt.value;
		history_of_commands.push("");
		history_index=history_of_commands.length-1;
		var resultPre=document.getElementById("consoletext");
		var resultDiv=document.getElementById("consoletextdiv");
		r2.cmd(txt.value,function(res){
			resultPre.innerHTML=resultPre.innerHTML+"\n> "+txt.value+"\n\n"+res;
		})
		txt.value="";
		refreshPanes(panes);
		resultDiv.scrollTop=resultDiv.scrollHeight;
	}
	changed=false;
	if(e.which==38){ // Up arrow.
		history_index--;
		var changed=true;
		if(history_index<0){
			history_index=0;
			changed=false;
		}
	}
	if(e.which==40){ // Down arrow.
		history_index++;
		var changed=true;
		if(history_index>=history_of_commands.length){
			history_index=history_of_commands.length-1;
			changed=false;
		}
	}
	if(changed){
		txt.value=history_of_commands[history_index];
	}
}

function addBgInDump(str, num, id){
	var leftMargin=8;
	r2.cmd("e asm.lineswidth", function(res){
		leftMargin=parseInt(res, 10);
	});
	var lines=str.split("\n");
	for(var i=0; i<lines.length; i++){
		var n1=lines[i].indexOf("0x");
		var nstripped=lines[i].replace(/(<([^>]+)>)/ig, "").indexOf("0x");
		if(n1!=-1 && nstripped<leftMargin+7){
			for(var j=n1+1;j<lines[i].length;j++){
				word=lines[i].substr(n1,j-n1);
				if(parseInt(word,16)===num){
					var line=[
						lines[i].substr(0, n1), 
						lines[i].substr(n1, j-n1), 
						lines[i].substr(j)
					]
					lines[i]=line[0]+"<span class='selectedBg' id='"+id+"'>"+line[1]+"</span>"+line[2];
				}
			}
		}
	}
	return lines.join("\n");
}

function toggleBreakpoint(num){
	r2.cmd("dbs "+num, function(res){
		refreshPanes(panes);
	});
}

function addBreakpointLinks(str){
	var leftMargin=8;
	r2.cmd("e asm.lineswidth", function(res){
		leftMargin=parseInt(res, 10);
	});
	var lines=str.split("\n");
	for(var i=0; i<lines.length; i++){
		var nstripped=lines[i].replace(/(<([^>]+)>)/ig, "").indexOf("0x");
		var n=lines[i].indexOf("0x");
		if(n===-1 || nstripped>leftMargin+7){continue;}
		var end=lines[i].substr(n).search(/[ \t]|$/);
		word=lines[i].substr(n,end);
		pre=lines[i].substr(0,n);
		post=lines[i].substr(n+end);
		lines[i]=pre+"<span onclick='toggleBreakpoint("+parseInt(word, 16)+
			")' class='breakpointLink' id='asm_off_"+parseInt(word,16)+"'>"+
			word+"</span>"+post;
	}
	return lines.join("\n");
}

function getReg(reg){
	reg=reg.replace( /^\s+|\s+$/g, '' ); // Strip whitespace.
	var num=0;
	r2.cmd("drj", function(res){
		num=JSON.parse(res)[reg];
	});
	return num;
}

function addDisassemblyPane(panes){
	panes.push({
		pane:addNewPane("Disassembly", {x:25, y:0, w:50, h:100}),
		cmd:
		function(pane){r2.cmd("i", function(res){
			var spl=res.split("\n");
			var binName="";
			for(i=0;i<spl.length;i++){
				var spl2=spl[i].split(/[ \t]/);
				if(spl2[0]==="file"){
					binName=spl2[spl2.length-1];
					break;
				}
			}
			r2.cmd("! objdump -h "+binName, function(res){
				var spl=res.split("\n");
				var disas="";
				var started=false;
				for(var i=0;i<spl.length;i++){
					var spl2=spl[i].split(/[ \t]/);
					for(var j=0;j<spl2.length;j++){
						if(spl2[j]===""){
							spl2.splice(j,1); 
							j--;
						}
					}
					if(spl2[0]==="0"){started=true;}
					if(!started){continue;}
					if(i!=spl.length-1 && spl[i+1].indexOf("CODE")!=-1){
						// Executable section, let's disassemble.
						var sz="0x"+spl2[2];
						var of="0x"+spl2[3];
						r2.cmd("pD "+sz+" @ "+of, function(res){
							disas=disas+res;
						})
					}
				}
				var ip="";
				r2.cmd("drn PC", function(ipn){
					ip=ipn;
					pane.content.innerHTML="<pre>"+
						addBreakpointLinks(
						addBgInDump(disas,getReg(ip),"selectedIP")
						)+"</pre>";
					console.log("Disas length:"+disas.length);
					current_pos_span=document.getElementById("selectedIP");
					if(current_pos_span==null){
						pane.content.scrollTop=0;
					}
					else{
						pane.content.scrollTop=current_pos_span.offsetTop-
							pane.content.clientHeight/2;
					}
				});
			});
		})}
	});
}

function addRegisterPane(panes){
	panes.push({
		pane:addNewPane("Registers", {x:0, y:0, w:25, h:40}),
		cmd:"drr"
	})
}

function addStackPane(panes){
	panes.push({
		pane:addNewPane("Stack",      {x:0, y:40, w:25, h:60}),
		cmd:
		function(pane){r2.cmd("drn SP", function(sp){
			var sp_val=getReg(sp);

			var start=sp_val-256;
			r2.cmd("xr 512 @ "+start, function(stack){
				pane.content.innerHTML="<pre>"+addBgInDump(stack, 
					sp_val, "selectedSP")+"</pre>";
			})
			current_pos_span=document.getElementById("selectedSP");
			if(current_pos_span!=null){
				pane.content.scrollTop=current_pos_span.offsetTop-
					pane.content.clientHeight/2;
			}
		})}
	})
}
function addConsolePane(panes){
	pane=addNewPane("Console",      {x:75, y:0, w:25, h:85})
	pane.content.innerHTML=
		"<div class=\"console\">\n"+
		"<div class=\"consoletext\" id=\"consoletextdiv\">\n"+
		"<pre id=\"consoletext\">\n"+
		"Welcome to interactive Radare2 frontend.\n"+
		"This place is console, just like in radare2.\n"+
		"You can move windows or resize them if you want.\n"+
		"Do NOT try to restart binary through this web\n"+
		"interface via \"do\" command. Instead, go to\n"+
		"actual radare2 console, press ^C, then type \"do;=h\"\n"+
		"and refresh the website.\n"+
		"Note: standard input and output still go through\n"+
		"radare2 terminal, not the web one.\n"+
		"</pre>\n"+
		"</div>\n"+
		"<div style=\"width:95%; margin-left:2.5%; margin-bottom:15px; margin-top: 6px\">\n"+
		"<input type=\"text\" style=\"width:100%;\" onkeydown=\"key_down(this,event)\">\n"+
		"</div>\n"+
		"</div>";
}
function addDebuggerControlsPane(panes){
	pane=addNewPane("Debugger controls",      {x:75, y:85, w:20, h:15})
	pane.content.innerHTML=
		"<div class=\"buttons\">\n"+
		"<a class=\"button_wrapper\" onclick=\"r2.cmd('ds'    ,function(r){refreshPanes(panes)})\"> Step into </a>\n"+
		"<a class=\"button_wrapper\" onclick=\"r2.cmd('dso'   ,function(r){refreshPanes(panes)})\"> Step over </a>\n"+
		"<a class=\"button_wrapper\" onclick=\"r2.cmd('dcr;ds',function(r){refreshPanes(panes)})\"> Step out  </a>\n"+
		"<a class=\"button_wrapper\" onclick=\"r2.cmd('dc'    ,function(r){refreshPanes(panes)})\"> Continue  </a>\n"+
		"<a class=\"button_wrapper\" onclick=\"r2.cmd('dcp'   ,function(r){refreshPanes(panes)})\"> Continue to code  </a>\n"+
		"</div>";
}

function addCustomPane(panes){
	var comm=prompt("Please input command:","drr");
	if(comm!=null){
		var title=prompt("Please input title for the window:","Registers");
		if(title!=null){
			panes.push({
				pane:addNewPane(title, {x:50, y:50, w:20, h:30}),
				cmd:comm
			})
			refreshPane(panes[panes.length-1]);
		}
	}
}

function resetPanes(panes){
	for(var i=0;i<panes.length;i++){
		if(document.contains(panes[i].pane.content)){
			panes[i].pane.destroy();
		}
	}
	panes.splice(0, panes.length);

	addDisassemblyPane(panes);
	addRegisterPane(panes);
	addStackPane(panes);
	addConsolePane(panes);
	addDebuggerControlsPane(panes);

	refreshPanes(panes);
}

var automatic_commands=".dr*";
r2.cmd("e scr.html=true;e scr.color=true", function(){});
var panes=[]; // Panes, that have to refresh whenever debugger steps.
resetPanes(panes);
