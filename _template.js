#!/usr/bin/env node
/**********************************************************************
* 
* Test module template...
* 
* Repo and docs:
* 	https://github.com/flynx/test.js
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var test = require('ig-test')



//---------------------------------------------------------------------

test.Setups({
	/*// Setups create state to be tested...
	setup: function(assert){
		// create test state...
		return {
			// ...
		}
	},
	//*/
})


test.Modifiers({
	/*// Modifiers get applied to results of setup members to modify it...
	modify: function(assert, data){
		// modify test data...
		// ...
		return data },
	//*/
})


test.Tests({
	/*// Tests get state from setup/modifier and assert it... 
	test: function(assert, data){
		// test aspects of data...
		// ...
		assert(data)
	},
	//*/
})


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

test.Cases({
	/*// Nested/independent test set...
	'nested-test-set': test.TestSet(function(){
		this.Setups({})
		this.Modifiers({})
		this.Tests({})
		this.Cases({})
	}),
	//*/
})


//---------------------------------------------------------------------
typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	&& test.run()



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
