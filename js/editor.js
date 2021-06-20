var config=new Object;
var arrayOfContent=[];
var lists=[]

const item_list_selector='item-list-selector'
const subject_list_selector='subject-list-selector'
var currentFilename=undefined
var previousFilename=undefined

const DEBUG=true

const skipsave=false
const restrictedsave=false
const showsavealert=false
//const BASE='lists/'

function SaveList(content,filename) {
    if(filename==undefined) {
        throw error
        //return
    }
    DEBUG && console.log("SaveList(...content...,"+filename+");");
    $('#saveButton').prop('disabled', true);

    if(restrictedsave) {
        console.log("-- RESTRICTED SAVE MODE, for safety! --")    
        if(!filename.includes("test")) {
            $('#saveButton').prop('disabled', false);
            return
        }
    }

    if(skipsave) {
        console.log("-- SKIPPING SAVE, for safety! --")    
        $('#saveButton').prop('disabled', false);
        return
    }
    
    dropVars(); //potential bug; this function works on arrayOfContent global rather than content local
    DEBUG && console.log(JSON.stringify(content,null,3));
    
    DEBUG && console.log("OVERWRITING your data in "+filename);

    $.ajax({
        url: 'items/'+filename,  //relative target route
        type: 'post',  //method
        dataType: 'json',  //type to receive... json
        contentType: 'application/json', //contenttype to send
        success: function (data) {
           $('#saveButton').prop('disabled', false);
           console.log("success in saving content for filename: "+this.url)
           if(showsavealert) alert(data.msg)
       },
       data: JSON.stringify(content), // content to send; has to be stringified, even though it's application/json
       error: function(err){   //something bad happened and ajax is unhappy
            console.log(JSON.stringify(err,null,3));
            if(showsavealert) alert(err.responseJSON.error);
       }

   }).done(function(data) {
       console.log("done");
       //re-enable save button
       $('#saveButton').prop('disabled', false);
       
   });
}

function saveit() {
    if(currentFilename!=undefined) SaveList(arrayOfContent,currentFilename);
}


async function SelectNewFile(nf) {
    if(nf==undefined) {
        throw error
    }    
    
    console.log("====SelectNewFile("+nf+")")
    
    
    var p=currentFilename;
    console.log("\tcurrent file is "+currentFilename)
    console.log("\tselected file is "+lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()])


    var newsubject=nf.includes('/') && nf.split('/')[0] || lists[$('#'+subject_list_selector).val()].subject
    console.log("\twith new subject: "+newsubject)

    if(!nf.includes('/')) nf=newsubject+'/'+nf


    console.log("\tdesired file is "+nf)




    if(nf!=undefined) {
        
        
        //if current subject and desired subject (within new filename nf, then select it)
        if(lists[$('#'+subject_list_selector).val()].subject!=newsubject) {
            //console.log("need new subject: "+newsubject)

            for(var i=0; i<lists.length; i++) {
                if(lists[i].subject==newsubject) {
                    $('#'+subject_list_selector).val(i)
                    //this.subjectListIndex=i
                    console.log("found and selected new subject ("+newsubject+")")

                    rebuildListSelector(subject_list_selector,lists,newsubject)

                    continue;
                }
            }
        } else {

            console.log("sticking with same subject ("+newsubject+")")
        }
    }

       //either the subject didn't change or it did; our lists should be correct now
       console.log("current subject index = "+$('#'+subject_list_selector).val());
       console.log("current list index = "+rebuildListSelector(item_list_selector,lists[$('#'+subject_list_selector).val()].entries,nf))
   
    if(currentFilename!=undefined && config.autosave) SaveList(arrayOfContent,currentFilename);
 

    arrayOfContent=await ajaxGetJSON('items/'+lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()]);
    currentFilename=lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()];
    render();

    $("#backBTN").prop("disabled",p==currentFilename);
    if(p==currentFilename) previousFilename=undefined;
    else previousFilename=p;
}

function SaveAndLoad(newfilename) {
    SelectNewFile(newfilename);
}

function changeItem() {
    SelectNewFile(lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()]);
}


function changeSubject() {
    SelectNewSubject(lists[$('#'+subject_list_selector).val()].subject,lists[$('#'+subject_list_selector).val()].subject+"/index."+config.ext)
}

function SelectNewSubject(newsubject,newfile) {
    
    if(newsubject==undefined && newfile==undefined) {
        console.log("neither subject nor file is defined; checking defaults")
        newfile=config.defaultItem || (config.defaultSubject+"/index."+config.ext);
        newsubject=tj.split('/')[0]
    }
    
    console.log("want to change subject to "+newsubject+" and load list "+newfile)
    // for(var i=0; i<lists.length; i++) {
    //     if(lists[i].subject==newsubject) {
    //         $('#'+subject_list_selector).val(i)
    //         console.log("found and selected new subject")
    //     }
    //     tj=lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()]
    // }

    //subjectListIndex=$('#'+subject_list_selector).val();

    // console.log("changeSubjectList(): fire rebuild list-selector")

    // var t=lists[$('#'+subject_list_selector).val()].subject

    // if(tj.startsWith(t)) {
    //     console.log("tj DOES start with "+t)
    // } else {
    //     console.log("tj does NOT start with "+t)
     
    //     tj=t+"/index."+config.ext
    // }
    // console.log("\tcalling rebuildListSelector with tj="+tj)

    rebuildListSelector(item_list_selector,lists[$('#'+subject_list_selector).val()].entries,newfile)


    //newFilename=lists[$('#subject-list-selector').val()].entries[$('#list-selector').val()]
    //changeItem();
    SelectNewFile(lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()]);

}

function revertList() {
    if(previousFilename!=undefined) {
        console.log("calling SelectNewFile("+previousFilename+")")

        SelectNewFile(previousFilename);
    }
    $("#backBTN").prop("disabled",true);
}
async function startTodo() {
    //load /config into memory
	config=await ajaxGetJSON("config/");

	//load items into memory
	lists=await ajaxGetJSON("items");

	//render selectors
    DEBUG && console.log("config.defaultSubject="+config.defaultSubject)
    rebuildListSelector(subject_list_selector,lists,config.defaultSubject)
    
    DEBUG && console.log("config.defaultItem="+config.defaultItem)
	rebuildListSelector(item_list_selector,lists[$('#'+subject_list_selector).val()].entries,config.defaultItem)

    //load default topic and json
    currentFilename=lists[$('#'+subject_list_selector).val()].entries[$('#'+item_list_selector).val()] 
    previousFilename=undefined // on purpose, also disable back button
    $("#backBTN").prop("disabled",true);
    DEBUG && console.log("loading: "+currentFilename)
    arrayOfContent=await ajaxGetJSON('items/'+currentFilename)

	//render it
	render();
}

function addIt() {
    console.log("add new item");
    var object={};

    object.name=$("#itemName").val();
    object.votes=0;
    object.skip=false;
    if($("#itemJSON").val()!="") object.json=$("#itemJSON").val();

	if($("#itemPeriod").val()!="") {
		object.periodic=true;
		object.period=Number($("#itemPeriod").val());
		var now=new Date();
		var dtom=DaysToMS(object.period)
		console.log("days="+object.period);
		console.log("ms="+dtom);
		console.log("ms(now)="+now.getTime());
		var dueDate=new Date(now.getTime()+dtom);
		object.nextDue=dueDate.getTime();
		
		console.log("next due is "+object.nextDue);
		console.log("\tas date: "+EpocMStoISODate(object.nextDue));
	}
    arrayOfContent.push(object);

    $("#itemName").val("");
    $("#itemJSON").val("");
    $("#itemPeriod").val("");
    render();
    saveit();
}