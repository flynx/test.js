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
		assert(true, 'setup')
		return {setup: 'setup'} })

tests.Setups({
	setup2: function(assert){
		assert(true, 'setup')
		return {setup: 'setup2'} },
	async: async function(assert){
		assert(true, 'setup')
		return {setup: 'async'} },
})


tests.Modifiers({
	sync: function(assert, setup){
		assert(setup, 'modifier')
		setup.mod = 'sync'
		return setup },
	async: async function(assert, setup){
		assert(setup, 'modifier')
		setup.mod = 'async'
		return setup },
})


tests.Setup('setup', 
	function(assert){ 
		assert(false, 'setup (shadowed): assert')
		return {} })

tests.Test('basic', 
	function(assert, setup){
		assert(setup, 'test') 
		assert.log(setup)
	})

tests.Tests({
	async: async function(assert, setup){
		assert(setup, 'test')
		assert.log(setup)
	},
})

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
