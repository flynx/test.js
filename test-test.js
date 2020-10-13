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
		assert(true, 'setup: assert')
		return {} })

tests.Setups({
	setup2: function(assert){
		assert(true, 'setup2: assert')
		return {} },
	setup3: function(assert){
		assert(true, 'setup3: assert')
		return {} },
})

tests.Setup('setup', 
	function(assert){ 
		assert(false, 'setup (shadowed): assert')
		return {} })

tests.Test('dummy', 
	function(assert, setup){
		assert(true, 'dummy: assert') })


// a nested test set...
tests.Case('nested', 
	tests.TestSet(function(){
		this.Case('moo', function(assert){
			assert(true, 'nested dummy: assert') })
	}))



//---------------------------------------------------------------------
typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	&& tests.run()



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
