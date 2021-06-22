// Copyright (c) 2020 C Delezenski <cmd184psu@gmail.com>
//  
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  
//      http://www.apache.org/licenses/LICENSE-2.0
//  
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

require("dotenv").config();


const express = require('express'), app = express(), port = process.env.PORT || 5050;
const bodyParser = require('body-parser');
const  glob = require('glob')
let path = require('path');  
const fs = require("fs");
const https = require('https');
const URL = require('url');


app.use(express.static(path.join(__dirname, 'data')));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//5 minutes
const apiTimeout = 5*60000;
app.timeout=apiTimeout;
https.timeout=apiTimeout;


app.use((req, res, next) => {
    // Set the timeout for all HTTP requests
    req.setTimeout(apiTimeout, () => {
        let err = new Error('Request Timeout');
        err.status = 408;
        next(err);
    });
    // Set the server response timeout for all HTTP requests
    res.setTimeout(apiTimeout, () => {
        let err = new Error('Service Unavailable');
        err.status = 503;
        next(err);
    });
    next();
});

const BASE=process.env.BASE || '.';
var config=JSON.parse(fs.readFileSync(BASE+'/data.json', 'utf8'));

function btoa(data) {
	return Buffer.from(data).toString('base64');
}

function prettyPrint(req, res, content) {
	res.setHeader('Content-Type', 'application/json');
	if(req.query!=undefined && req.query.pretty!=undefined) {
		res.setHeader('Content-Type', 'text/plain');
//		res.setHeader('Content-Disposition','inline');
		res.send(JSON.stringify(content,null,3));
	} else {
		res.send(content);
	}
}

var flatdb=BASE+"/data.json";

console.log("sending: "+flatdb);
app.get('/config', function(req, res) {
	config=JSON.parse(fs.readFileSync(flatdb, 'utf8'));
	
	var content=new Object
	content.defaultSubject=config.defaultSubject || process.env.DEFAULTSUBJECT || "home"

	content.index=config.index || process.env.INDEX || "todo.html" //todo.html or slideshow.html
	content.prefix=config.prefix || process.env.PREFIX || "lists" //list or nt
	content.ext=config.ext || process.env.EXT || "json" //json or jpg

	var di=config.defaultItem || process.env.DEFAULTITEM || ""

	//if config and env have nothing for defaultsubject, we need to infer from defaultitem
	if(config.defaultSubject==undefined && process.env.DEFAULTSUBJECT==undefined && di.includes("/")) {
		content.defaultSubject=di.split('/')[0]
		content.defaultItem=di
	} else {
		content.defaultItem=config.defaultItem || process.env.DEFAULTITEM || content.defaultSubject+"/index."+content.ext
	}
	
	content.autosave=(config.autosave || (process.env.AUTOSAVE && process.env.AUTOSAVE.toString().toLowerCase().trim().startsWith("true")))

    if(config.minHeight!=undefined) {
	  content.minHeight=config.minHeight;
	} else if(process.env.MINHEIGHT!=undefined) {
	  content.minHeight=process.env.MINHEIGHT;(config.minHeight  )
    } else {
	  content.minHeight="200px"
    }

    if(process.env.TODO!="" && process.env.TODO!=undefined) {
		content.todo=(process.env.TODO=="true")
	}
	prettyPrint(req,res,content)
	res.end();
});

app.post('/config', function(req, res) {
	console.log("writing file!");
	var data=req.body;

	console.log("received content:")
	console.log(JSON.stringify(data))
	console.log("want to write it to "+flatdb)

	const { headers } = req;

	//if(headers['content-type']!="applicaiton/json" || 
	
	console.log("content-type: "+headers['content-type'])
	var filename=process.cwd()+"/data.json"

	try {
		if (!fs.existsSync(filename)) {
			console.log("requested item: "+filename+" does not exist")
			res.status(404).send({ error: 'invalid request' })
			res.end();
			return		  //file exists
		}

		//file exists, ok to continue
	} catch(err) {
		console.error(err)
		res.status(500).send({ error: 'error checking file existence' })
		res.end();
		return
	}

	//don't need this, the content-type protects us (maybe?)
	var body=undefined
	try {
		body=JSON.parse(JSON.stringify(req.body))
	} catch(err) {
		console.error(err)
		res.status(405).send({ error: 'parse error: content is not json' })
		res.end();
		return	
	}

	console.log("About to write: "+filename)
	console.log("==== begin content ====")
	console.log(JSON.stringify(body,null,3))
	console.log("====  end content  ====")
	try{ 
		fs.writeFileSync(filename, JSON.stringify(body,null,3));
		res.send({ msg: 'File '+filename+' written successfully.'})
	} catch(err) {
		if( err ) {
			console.error( err );
			res.status(400).send({ error: 'unable to write to file '+filename })
			
		}
	}
	res.end();
});


const rejects = new Set(['#recycle','css', 'js', 'node_modules', 'nodestuff', 'webfonts'])


app.get('/subjects/:subject',function(req,res) {
	console.log("/subjects/{subject}")
	var rootdir=process.env.PREFIX || 'nt'
	var ext=process.env.EXT || 'jpg'

	if(req.params!=undefined && req.params.subject!=undefined) {
		//single subject use case
		var entries=[]
		entries=glob.sync(rootdir+'/'+req.params.subject+'/*.'+ext).map(f => f.substr(rootdir.length+1))
		prettyPrint(req,res,entries)
		res.end();
	} else {
		//send all subjects
		const subjects = fs.readdirSync(rootdir); 
		var dirlist=[];

		console.log("directories:"); 
		subjects.forEach(subject => { 
			if(!rejects.has(subject) && fs.statSync(rootdir+'/'+subject).isDirectory()) {
				var item=new Object;
				item.subject=subject;
				item.entries=[];
				dirlist.push(item)
			}
		})
		prettyPrint(req,res,dirlist)
		
	}
	res.end();
})


function getAllItems(req,res) {
	var rootdir=process.env.PREFIX || 'lists'

	var ext=process.env.EXT || 'json'

	const subjects = fs.readdirSync(rootdir); 
	var dirlist=[];

	console.log("directories:"); 

	var rightnow=new Date();

	var allowedAge=process.env.AGE || 30; // default is to disallow pics older than 30 days
	var unrestrictedAge=process.env.UNRESTRICTED;
	var start_subject=process.env.START_SUBJECT;
	var end_subject=process.env.END_SUBJECT;
        var image_restricted_len=process.env.ITEMS_RESTRICTEDLEN;

        if(start_subject==undefined) start_subject=0;
	if(end_subject==undefined) end_subject=subjects.length;


	//lenrestricted=15;
	//unrestrictedAge=true;
	subjects.slice(start_subject,end_subject).forEach(subject => { 
		const stats=fs.statSync(rootdir+'/'+subject);
		const stats2=fs.existsSync(rootdir+'/_'+subject)
		if(!rejects.has(subject) && !subject.startsWith("_") && !subject.startsWith(".git") && stats.isDirectory() && !stats2) {
			var item=new Object;
			item.subject=subject;
			item.timestamp=stats.mtime.getTime();
			//console.log("item.timestamp="+item.timestamp);
			item.entries=[];

			// reject if older than x days ago
			// x=60
			// y=60 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
			//var d=; //d=60
			//console.log("comparing "+rightnow.getTime()+"-"+stats.mtime.getTime()+" with "+(allowedAge * 86400000))
			//console.log("\tcomparing "+(rightnow.getTime()-stats.mtime.getTime())+" with "+(allowedAge * 86400000))
			item.age=(rightnow.getTime()-stats.mtime.getTime())/86400000;
			if(unrestrictedAge || rightnow.getTime()-stats.mtime.getTime()< allowedAge * 86400000) {
				//console.log("\tallowing it");
				dirlist.push(item)
			} 
			// else {
			// 	console.log("\trejecting subject "+subject+" as too old")
			// }

		}
	})
	var configchange=false;
	var items_pushed=0;
	for(var i=0; i<dirlist.length; i++) {
		if(image_restricted_len==undefined || image_restricted_len>items_pushed) {
		dirlist[i].entries=glob.sync(rootdir+'/'+dirlist[i].subject+'/*.'+ext).map(f => f.substr(rootdir.length+1))
		items_pushed+=dirlist[i].entries.length;
		if(dirlist[i].entries.length==0) {
			dirlist[i].entries.push("no-elements")
			if(config.deleted==undefined) config.deleted=[]
			config.deleted.push(dirlist[i].entries.subject)
			configchange=true
		}
		}
	}
	prettyPrint(req,res,dirlist)
	if(configchange) {
		console.log("need to save changes")
	} 

	console.log("number of entries pushed (total):" + items_pushed);
	res.end();
}


app.get('/items', function(req,res) { getAllItems(req,res) });

app.get('/items/:subject/:item',function(req,res) {
	const { headers } = req;
	if(req.params==undefined || req.params.item==undefined) {
		return getAllItems(req,res);
	}
	//console.log("requested item: "+process.cwd()+"/"+process.env.PREFIX+"/"+req.params.subject+"/"+req.params.item)

 	var contentType='application/json';
 	if(process.env.EXT==".json") contentType='application/json';
 	else if(process.env.EXT==".png") contentType='image/png';
 	else if(process.env.EXT==".md") contentType='text/plain';
 
 
 	sendFileContent(res, process.cwd()+"/"+process.env.PREFIX+"/"+req.params.subject+"/"+req.params.item, contentType);
	//res.end();
});



app.post('/items/:subject/:item',function(req,res) {
	console.log("app.post(/items/{subject}/{item}")
	const { headers } = req;

	//if(headers['content-type']!="applicaiton/json" || 
	if(req.params==undefined || req.params.subject==undefined || req.params.item==undefined) {
		console.log("REJECTED: "+req.url+" with content-type "+headers['content-type'])
		res.status(400).send({ error: 'Invalid Request' })
		res.end();
		return
	}
	console.log("content-type: "+headers['content-type'])
	var filename=process.cwd()+"/"+process.env.PREFIX+"/"+req.params.subject+"/"+req.params.item
	if(req.params.item.endsWith==".json") {
	  JSONWriter(filename,req,res);
	} else {
	  DocWriter(filename,req,res);
	}
	res.end();
});

function JSONWriter(filename, req,res) {
	console.log("using json writer...")
	try {
		if (!fs.existsSync(filename)) {
			console.log("requested item: "+filename+" does not exist")
			res.status(404).send({ error: 'invalid request' })
			res.end();
			return		  //file exists
		}

		//file exists, ok to continue
	} catch(err) {
		console.error(err)
		res.status(500).send({ error: 'error checking file existence' })
		res.end();
		return
	}

	//don't need this, the content-type protects us (maybe?)
	var body=undefined
	try {
		body=JSON.parse(JSON.stringify(req.body))
	} catch(err) {
		console.error(err)
		res.status(405).send({ error: 'parse error: content is not json' })
		res.end();
		return	
	}

	console.log("About to write: "+filename)
	console.log("==== begin content ====")
	console.log(JSON.stringify(body,null,3))
	console.log("====  end content  ====")
	try{ 
		fs.writeFileSync(filename, JSON.stringify(body,null,3));
		res.send({ msg: 'File '+filename+' written successfully.'})
	} catch(err) {
		if( err ) {
			console.error( err );
			res.status(400).send({ error: 'unable to write to file '+filename })
			
		}
	}
}

function DocWriter(filename, req,res) {
	console.log("using doc writer...")
	try {
		if (!fs.existsSync(filename)) {
			console.log("requested item: "+filename+" does not exist")
			res.status(404).send({ error: 'invalid request' })
			res.end();
			return		  //file exists
		}

		//file exists, ok to continue
	} catch(err) {
		console.error(err)
		res.status(500).send({ error: 'error checking file existence' })
		res.end();
		return
	}



	var body=undefined
	try {
		body=JSON.parse(JSON.stringify(req.body))
	} catch(err) {
		console.error(err)
		res.status(405).send({ error: 'parse error: content is not json' })
		res.end();
		return	
	}
	
	console.log("About to write: "+filename)
	console.log("==== begin content ====")
	console.log(body.content)
	console.log("====  end content  ====")
	try{ 
		fs.writeFileSync(filename, body.content);
		res.send({ msg: 'File '+filename+' written successfully.'})
	} catch(err) {
		if( err ) {
			console.error( err );
			res.status(400).send({ error: 'unable to write to file '+filename })
			
		}
	}


}




function ENVvaristrue(m) {
	return m && (m.toString().trim().toLowerCase().startsWith('true'))
}
app.get("/*", function(req, res) {
	var url=req.url;
	
	if(ENVvaristrue(process.env.STRICT) && (url.startsWith(process.env.PREFIX) || url.startsWith("/"+process.env.PREFIX))) {
		console.log("REJECTED:"+url)
		res.status(403).send({ error: 'Permission Denied' })
		res.end();
		return;
	} 

	var index_html="/index.html";

	if(process.env.INDEX!="" && process.env.INDEX!=undefined) {
		index_html=process.env.INDEX;
	}

	var contentType="text/plain";	
	if(req.url.toString()=="/") {
		url=index_html;
		contentType="text/html";
	} else if(url.endsWith(".js")){
		contentType="text/javascript";
	} else if(url.endsWith(".json")){
		contentType="application/json";
	 } else if(url.endsWith(".html")){
		contentType="text/html";
	 } else if(url.endsWith(".png")){
		contentType="image/png";
	} else if(url.endsWith(".jpg")){
		contentType="image/jpg";
	} else if(url.endsWith(".woff")){
		contentType="font/woff";
	 } else if(url.endsWith(".woff2")){
		contentType="font/woff2";
	} else if(url.endsWith(".tff")){
		contentType="font/ttf";
	} else if(url.endsWith(".css")){
		contentType="text/css";
	} 
	console.log("Requested URL is: " + url + " with contentType "+contentType);
	
	sendFileContent(res, process.cwd()+url, contentType);
})

function sendFileContent(response, fileName, contentType){
	fs.readFile(fileName, function(err, data){
		if(err){
			response.writeHead(404);
			response.write("Not Found!");
		}
		else{
			response.writeHead(200, {'Content-Type': contentType});
			response.write(data);
		}
		response.end();
	});
}

app.listen(port);
console.log('(NodeJS Editor engine) RESTful API server started on: ' + port);
