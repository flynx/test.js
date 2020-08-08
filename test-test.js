#!/usr/bin/env node
/**********************************************************************
* 
* test.js
*
* Repo and docs:
* 	https://github.com/flynx/test.js
*
*
* XXX need an interface, preferably zero-config with command-line...
* 		something like:
* 			$ ig-test ./test.js base:*:*		- test script...
* 		or:
* 			$ ig-test base:*:*					- locate tests...
* XXX need a way to reuse the thing...
*
*
*
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var tests = require('./test')



//---------------------------------------------------------------------

tests.Setup('single-dummy', 
	function(){ console.log('DUMMY TEST') })

tests.Setups({
	dummy: function(){
		console.log('DUMMY TEST') },
})




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
