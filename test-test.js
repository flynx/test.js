#!/usr/bin/env node
/**********************************************************************
* 
* test.js
*
* Repo and docs:
* 	https://github.com/flynx/test.js
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var tests = require('./test')



//---------------------------------------------------------------------

tests.Setup('setup', 
	function(assert){ 
		assert(true, 'assert')
		return {} })

tests.Setups({
	setup2: function(assert){
		assert(true, 'assert')
		return {} },
	setup3: function(assert){
		assert(true, 'assert')
		return {} },
})

// XXX for some reason this is run twice....
tests.Test('dummy', 
	function(assert, setup){
		assert(true, 'assert')
	})

console.log('>>>>', tests.Tests.members)
console.log('>>>>', tests.Tests.keys())
// XXX this does not call the Merged.length for some reason...
console.log('>>>>', tests.Tests.size)




//---------------------------------------------------------------------
typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	&& tests.run()



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
