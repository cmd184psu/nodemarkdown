

const COOLDOWN_TIME=600000
const AUTO_SAVE_ENABLED=false
const AUTO_SAVE_PERIOD=60000
const VOTES_TO_CAST=100


var currentFilename="";


var priorFilename="";
var maxVotes=0;

const DEBUG_UTILS=false

// function LoadFile(filename) {
// 	return new Promise((resolve, reject) => {

//         //$("#loaded").html(filename);
//         console.log("attempting to load "+$('lists-selelctor'))
//         $.get(BASE+filename,"", function(result) { resolve(result); });
//     });
// }
function ajaxGet(uri) {
	return new Promise((resolve, reject) => {
        $.get(uri,"", function(result) { resolve(result); });
    });
}

function ajaxGetJSON(uri) {
    return new Promise((resolve, reject) => {
        fetch(uri).then(async (response)=> {
            resolve(await response.json())
        })
    })
}    

function dropVars() {
    for(var i=0; i<arrayOfContent.length; i++) {
        arrayOfContent[i].votes=undefined;
        arrayOfContent[i].winner=undefined;
        arrayOfContent[i].resetWeight=undefined;
        arrayOfContent[i].currentWeight=undefined;
        arrayOfContent[i].value=undefined;
        arrayOfContent[i].winner=undefined;
        arrayOfContent[i].vote=undefined;
        arrayOfContent[i].expires=undefined;
        arrayOfContent[i].tempSkip=undefined;
    }
}
function clearWinner() {
    for(var i=0; i<arrayOfContent.length; i++) {
        if(arrayOfContent[i].winner!=undefined) arrayOfContent[i].winner=undefined;
    }
}




function calcValue(v,tv) {
    return v/tv;
}

function TotalVotes(list) {
    var totalVotes=0;
    for(var i=0; i<list.length; i++) {
	    totalVotes+=list[i].votes;
    }
    return totalVotes;
}

function skipit(i) {
    arrayOfContent[i].skip=true;
    render();
    saveit();
}

function dontskipit(i) {
    arrayOfContent[i].skip=false;
    render();
    saveit();
}

function deleteit(i) {
    arrayOfContent.splice(i,1);  
    render();
    saveit();
}

function onHoldFlip(i) {
    arrayOfContent[i].onHold=!arrayOfContent[i].onHold;
    render();
    saveit();
}

function DaysToMS(days) {
	//return days*24*60*60*1000;
	return days*86400000;
}

function EpocMStoISODate(ms) {
	var d=new Date(ms);
	return formatedDate(d);
}

function isDueNow(ms) {
    var now=new Date();
    return ms<now.getTime();
}

function formatedDate(d) {
    return (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();
}

function resetDueDate(i) {
    var now=new Date();
	var dtom=DaysToMS(arrayOfContent[i].period)
	console.log("days="+arrayOfContent[i].period);
	console.log("ms="+dtom);
    console.log("ms(now)="+now.getTime());
    console.log("formated date(now)="+formatedDate(now))
	var dueDate=new Date(now.getTime()+dtom);
	arrayOfContent[i].nextDue=dueDate.getTime();
	console.log("next due is "+arrayOfContent[i].nextDue+" "+EpocMStoISODate(arrayOfContent[i].nextDue));
    render();
}



function moveUp(i) {
    if(i==0) {
        console.log("already at end of list");
    } else {
        console.log("move i="+i+" to "+(i-1));

        var temp=arrayOfContent[i];
        arrayOfContent[i]=arrayOfContent[i-1];
        arrayOfContent[i-1]=temp;
        render();
    }
}
function moveDown(i) {
    if(i==arrayOfContent.length-1) {
        console.log("already at end of list");
    } else {
        console.log("move i="+i+" to "+(i+1));
        var temp=arrayOfContent[i];
        arrayOfContent[i]=arrayOfContent[i+1];
        arrayOfContent[i+1]=temp;
        render();
    }
}

function resetCoolDown(i) {
    arrayOfContent[i].expires=0;
    render();
}

function isInCoolDown(item) {
    var d=new Date();
    return (item.expires!=undefined && item.expires>d.getTime());
}
function renderRow(i) {
    //add delete column
    //var row="<td name=\"delcol\"><button onclick=\"deleteit("+i+")\">Delete</button></td>";
    var row="";
    var trophy="";

    var d=new Date();
    if(arrayOfContent[i].winner) {
        trophy="<td><i class=\"fas fa-trophy\"></i></td>";
        arrayOfContent[i].expires=d.getTime()+COOLDOWN_TIME;
        
    }

    

    var updown="<table>";
    
    //if(arrayOfContent[i].onHold) updown+="<tr bgcolor=pink>";
    //else 
    updown+="<tr>";

    if(arrayOfContent[i].onHold) trbit="<tr bgcolor=pink>";
    else trbit="<tr>";
    updown+="<td><span onclick=\"moveUp("+i+")\"><i class=\"fas fa-angle-double-up\"></i></span></td>";
    updown+="<td><span onclick=\"moveDown("+i+")\"><i class=\"fas fa-angle-double-down\"></i></span></td>";
    updown+="<td><span onclick=\"onHoldFlip("+i+")\"><i class=\"fas fa-hand-paper\"></i></td>";
    updown+="<td><span onclick=\"deleteit("+i+")\"><i class=\"fa fa-trash\"></i></td>";
    updown+="<td>"+trophy+"</td>";
    updown+="</tr></table>";


   
    //add checkbox
    if(arrayOfContent[i].skip || (!arrayOfContent[i].winner && isInCoolDown(arrayOfContent[i]))) {
        row="<td><input type=\"checkbox\" checked onclick=\"dontskipit("+i+")\"/></td>";
        row+="<td>"+updown+"</td>";
        row+="<td>"+(i+1)+"</td>";
        row+="<td><strike>"+arrayOfContent[i].name+"</strike></td>";
    } else {
        row="<td><input type=\"checkbox\" onclick=\"skipit("+i+")\"/></td>";
        row+="<td>"+updown+"</td>";
        row+="<td>"+(i+1)+"</td>";


        var prepend="";
        var append="";
        if(arrayOfContent[i].periodic!=undefined && arrayOfContent[i].periodic && isDueNow(arrayOfContent[i].nextDue)) {
            prepend="<strong><b>";
            append="</b></strong>";
        }
        
        if(arrayOfContent[i].json!=undefined) {
            row+="<td><a href=\"javascript:SaveAndLoad('"+arrayOfContent[i].json+"')\">"+prepend+arrayOfContent[i].name+append+"</a></td>";
        } else {
            row+="<td>"+prepend+arrayOfContent[i].name+append+"</td>";
        }
    }
    

    //add vote count
    if(arrayOfContent[i].votes==undefined)
        row+="<td>&nbsp;</td>";
    else
        row+="<td>"+arrayOfContent[i].votes+"</td>";


	//new variables:
	//periodic - boolean; if true, this item is a recurring item
	//nextDue  - milliseconds since the EPOC / UTC, usually in the future; this is the next due date for this recurring item
	//period   - duration between due dates in days		

    // var content="<tr><th>Complete</th><th>Control</td><th>Priority</th><th>The Item</th><th>votes</th><th>Ready?</th><th>Period (in days)</th><th>Next Due Date</th></tr>";
    if(arrayOfContent[i].periodic==undefined || !arrayOfContent[i].periodic) {
        row+="<td></td><td></td>";
    } else {
        var dueDate=new Date(arrayOfContent[i].nextDue);

        row+="<td>"+arrayOfContent[i].period+"</td>";
        row+="<td><table><tr><td width=90px>"+formatedDate(dueDate)+"&nbsp;</td><td><span onclick=\"resetDueDate("+i+")\"><i class=\"fas fa-sync\"></i></span></td></tr></table></td>";
    }

    
    //cool down
    var timeRemaining=0;
    var coolDown="Cool down";
    if(arrayOfContent[i].expires==undefined || (arrayOfContent[i].expires-d.getTime()<=0)) { 
        coolDown="Ready";
    } 
    row+="<td><table><tr><td width=60px>"+coolDown+"&nbsp;</td><td><span onclick=\"resetCoolDown("+i+")\"><i class=\"fas fa-sync\"></i></span></td></tr></table></td>";

    
    //return "<tr>"+row+"</tr>";
    return trbit+row+"</tr>";
}

function eligibleToVote(item) {
    var d=new Date();
    if(item.skip || item.onHold) return false;
    if(item.expires!=undefined && item.expires-d.getTime()>0) return false;
    return true;
}
function vote() {
    //clear the vote
    for (var i = 0; i < arrayOfContent.length; i++) {
        arrayOfContent[i].votes=0;
    }

    var rand = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
 
    var generateVoteList = function(list) {
        var vote_list = [];
        console.log("list length="+list.length);
        
        for (var i = 0; i < list.length; i++) {
            if(eligibleToVote(list[i]) ) {
                console.log("list["+i+"].name="+list[i].name);
                // Loop over the list of items
                vote_list.push(list[i].name);
                
            }
        }
        return vote_list;
    };

    //var list = ['javascript', 'php', 'ruby', 'python'];
    
    var vote_list = generateVoteList(arrayOfContent);

    console.log(vote_list.length);
    var random_num = 0;
    var extra=0;
    var t=VOTES_TO_CAST;
    var old_random_num=-1;
    var random_num=-1;


    clearWinner();
    maxVote_j=-1;


    switch(vote_list.length) {
        case 0:
            console.log("no votes were cast");
        break;
        case 1:
            for(var j=0; j<arrayOfContent.length; j++) {
                if(arrayOfContent[j].name==vote_list[0]) {
                    arrayOfContent[j].votes=VOTES_TO_CAST;
                    arrayOfContent[j].winner=true;
                }
            }
        break;
        default: // size 2 or bigger
            for(var i=0; i<VOTES_TO_CAST; i++) {
                while(old_random_num==random_num) {
                    random_num=rand(0, vote_list.length-1);
                }
                old_random_num=random_num;
                for(var j=0; j<arrayOfContent.length; j++) {
                    if(arrayOfContent[j].name==vote_list[random_num]) {
                        arrayOfContent[j].votes++;
                    } else {
                        console.log("skipped: "+arrayOfContent[j].name)
                    }
                }
            }
        break;

    }
    total_vote_count=t;
    //console.log("extra votes: "+extra);
    
    maxVotes=0;
    maxVote_j=-1;
    for(var j=0; j<arrayOfContent.length; j++) {
        if(arrayOfContent[j].votes>maxVotes) {
            maxVotes=arrayOfContent[j].votes
            maxVote_j=j;
        }
    }

    if(maxVote_j>-1) {
        console.log("the winner is: "+arrayOfContent[maxVote_j].name+" with "+arrayOfContent[maxVote_j].votes)
        arrayOfContent[maxVote_j].winner=true;
    } else {
        console.log("no winner declared")
    }
   
    maxVotes=0;
    render();
}

//render currently loaded content
//also demonstrates how to use QUIET_LOCAL vs DEBUG_UTILS correctly
function render() {
    var QUIET_LOCAL=!DEBUG_UTILS && true

    //console.log("---> render()::QUIET_LOCAL="+QUIET_LOCAL)
    //console.log("---> render()::DEBUG_UTILS="+DEBUG_UTILS)

    var content="<tr><th>Complete</th><th>Control</td><th>Priority</th><th>The Item</th><th>votes</th><th>Period (in days)</th><th>Next Due Date</th><th>Cooldown</th></tr>";
    QUIET_LOCAL || console.log("length of array="+arrayOfContent.length);
    //console.log(JSON.stringify(arrayOfContent,null,3));
    for(var i=0; i<arrayOfContent.length; i++) {
        content+=renderRow(i);
		// for recurring expiration
    	if(arrayOfContent[i].periodic!=undefined && arrayOfContent[i].periodic) {
			QUIET_LOCAL || console.log("==>"+i+"th can expire");    

			//new variables:
			//periodic - boolean; if true, this item is a recurring item
			//nextDue  - milliseconds since the EPOC / UTC, usually in the future; this is the next due date for this recurring item
			//period   - duration between due dates in days		

            if(isDueNow(arrayOfContent[i].nextDue)) {
                QUIET_LOCAL || console.log("\tdue now and again in "+arrayOfContent[i].period+" days");
            } else {
                QUIET_LOCAL || console.log("\tdue in the future: "+EpocMStoISODate(arrayOfContent[i].nextDue));
			} 
		} else {
			QUIET_LOCAL || console.log("==>"+i+"th does not expire");
		}
    }

    content+="<tr><td name=\"delcol\">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>Totals</td><td>"+TotalVotes(arrayOfContent)+"</td><td colspan=3>=====</td></tr>";
    document.getElementById("thetable").innerHTML=content;
    // for cooldown
    var now=new Date();
    var future=new Date(60000+now.getTime());
    QUIET_LOCAL || console.log("==== "+(future.getUTCMilliseconds()-now.getUTCMilliseconds()));
    QUIET_LOCAL || console.log("now: "+formatedDate(now));
    QUIET_LOCAL || console.log("future: "+formatedDate(future));
}

function rebuildListSelector(s,l,desired) {
    const DEBUG_LOCAL=DEBUG_UTILS || false
    DEBUG_LOCAL && console.log("==>rebuildListSelector("+s+",list,"+(desired || "none")+")");
    $('#'+s)
    .find('option')
    .remove().end();
    var selector = document.getElementById(s);
    var retIndex=0
    //loop through lists for this subject
    for(var i=0; i<l.length; i++) {

        var opt = document.createElement('option');
        opt.innerHTML=l[i].subject || l[i];
        opt.value=i;
        DEBUG_LOCAL && console.log("===>adding "+opt.innerHTML+" as value "+opt.value)
        DEBUG_LOCAL && console.log("comparing "+l[i]+" vs "+desired)
        if(desired!=undefined && (desired==l[i] || desired==l[i].subject)) {
            retIndex=i
        }

        selector.appendChild(opt);
        DEBUG_LOCAL && console.log("looking at "+(i+1)+" of "+l.length)
    } 
    DEBUG_LOCAL && console.log("val of "+s+": "+$('#'+s).val())
    
    $('#'+s).val(retIndex);
    return retIndex;
}
