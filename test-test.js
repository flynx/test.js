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
		return await {setup: 'async'} },
})

tests.Modifiers({
	sync: function(assert, setup){
		assert(setup, 'modifier')
		setup.mod = 'sync'
		return setup },
	async: async function(assert, setup){
		assert(setup, 'modifier')
		setup.mod = 'async'
		return await setup },
})

tests.Tests({
	async: async function(assert, setup){
		assert(setup, 'test')
		await setup
		assert.log(setup) 
		assert(setup, 'done')
	},
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

tests.Case('async-completion',
   async function(assert){
		assert(true, 'start') 
		await assert(true, '1') 
		await assert(true, '2') 
		await assert(true, '3') 
		assert(true, 'done') 
   })	

// a nested test set...
tests.Case('nested', 
	tests.TestSet(function(){
		// XXX these can behave in an odd manner...
		// 			$ ./test.js nested --verbose
		// 		will prin the output of the sunc test while the async 
		// 		is waiting...
		// 		...not yet sure how to sequence these in a more predictable 
		// 		manner...
		// 		...this only affects output sequencing and not the actual 
		// 		execution flow...
		this.Case('async', async function(assert){
			assert(true, 'nested async: assert') 
			await 123
			assert(true, 'nested async: done') })

		this.Case('sync', function(assert){
			assert(true, 'nested sync: assert') })
	}))




//---------------------------------------------------------------------
typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	&& tests.run()



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
